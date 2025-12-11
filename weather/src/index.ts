import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Authorization helper
function validateAuthorizationHeader(authHeader: string | undefined): boolean {
    if (!authHeader) {
        return false;
    }

    // Check if header starts with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
        return false;
    }

    // Extract token (everything after "Bearer ")
    const token = authHeader.substring(7);

    // For now, just check that a token exists
    if (!token || token.trim() === "") {
        return false;
    }

    return true;
}

// Express middleware for authorization
function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!validateAuthorizationHeader(authHeader)) {
        res.status(401).json({
            error: "Unauthorized",
            message: "Valid Authorization header with Bearer token is required"
        });
        return;
    }

    next();
}

// Create server instance
const server = new McpServer({
    name: "weather",
    version: "1.0.0",
});

// Register weather tools
server.tool(
    "get_alerts",
    "Get weather alerts for a state",
    {
        state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
    },
    async ({ state }) => {
        const stateCode = state.toUpperCase();
        const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
        const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

        if (!alertsData) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve alerts data",
                    },
                ],
            };
        }

        const features = alertsData.features || [];
        if (features.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No active alerts for ${stateCode}`,
                    },
                ],
            };
        }

        const formattedAlerts = features.map(formatAlert);
        const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

        return {
            content: [
                {
                    type: "text",
                    text: alertsText,
                },
            ],
        };
    },
);

server.tool(
    "get_forecast",
    "Get weather forecast for a location",
    {
        latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
        longitude: z
            .number()
            .min(-180)
            .max(180)
            .describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
        // Get grid point data
        const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

        if (!pointsData) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
                    },
                ],
            };
        }

        const forecastUrl = pointsData.properties?.forecast;
        if (!forecastUrl) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to get forecast URL from grid point data",
                    },
                ],
            };
        }

        // Get forecast data
        const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
        if (!forecastData) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve forecast data",
                    },
                ],
            };
        }

        const periods = forecastData.properties?.periods || [];
        if (periods.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No forecast periods available",
                    },
                ],
            };
        }

        // Format forecast periods
        const formattedForecast = periods.map((period: ForecastPeriod) =>
            [
                `${period.name || "Unknown"}:`,
                `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
                `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
                `${period.shortForecast || "No forecast available"}`,
                "---",
            ].join("\n"),
        );

        const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

        return {
            content: [
                {
                    type: "text",
                    text: forecastText,
                },
            ],
        };
    },
);

 async function makeNWSRequest<T>(url: string): Promise<T | null> {
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Error making NWS request:", error);
        return null;
    }
}

interface AlertFeature {
    properties: {
        event?: string;
        areaDesc?: string;
        severity?: string;
        status?: string;
        headline?: string;
    };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
    const props = feature.properties;
    return [
        `Event: ${props.event || "Unknown"}`,
        `Area: ${props.areaDesc || "Unknown"}`,
        `Severity: ${props.severity || "Unknown"}`,
        `Status: ${props.status || "Unknown"}`,
        `Headline: ${props.headline || "No headline"}`,
        "---",
    ].join("\n");
}

interface ForecastPeriod {
    name?: string;
    temperature?: number;
    temperatureUnit?: string;
    windSpeed?: string;
    windDirection?: string;
    shortForecast?: string;
}

export interface AlertsResponse {
    features: AlertFeature[];
}

interface PointsResponse {
    properties: {
        forecast?: string;
    };
}

interface ForecastResponse {
    properties: {
        periods: ForecastPeriod[];
    };
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    let port = 3002;

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--port=")) {
            port = parseInt(args[i].split("=")[1], 10);
        }
    }

    return { port };
}

// Start server
async function main() {
    const { port } = parseArgs();

    const app = express();

    // Enable CORS
    app.use(cors({
        origin: "*",
        credentials: true
    }));

    app.use(express.json());

    // Health check endpoint (no auth required)
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", service: "weather-mcp" });
    });

    // Store transports by session ID
    const transports = new Map<string, StreamableHTTPServerTransport>();

    // MCP endpoint with authorization
    app.use("/mcp", authMiddleware, async (req: Request, res: Response) => {
        const sessionId = req.headers['mcp-session-id'] as string || randomUUID();

        let transport = transports.get(sessionId);

        if (!transport) {
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => sessionId
            });

            await server.connect(transport);
            transports.set(sessionId, transport);

            // Clean up transport after 5 minutes of inactivity
            setTimeout(() => {
                transports.delete(sessionId);
            }, 5 * 60 * 1000);
        }

        await transport.handleRequest(req, res, req.body);
    });

    app.listen(port, () => {
        console.error(`Weather MCP Server running on http://localhost:${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/mcp`);
    });
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});

