// Pre-filter configuration
export const PREFILTER_CONFIG = {
    HAIKU_MODEL: 'claude-3-5-haiku-20241022',
    HAIKU_MAX_TOKENS: 10,
    HAIKU_TEMPERATURE: 0,
    REJECTION_CHUNK_SIZE: 5,
    ENABLED: true  // Can disable for testing
};

// Use Claude Haiku to classify ambiguous queries
export async function classifyWithHaiku(anthropic, userMessage) {
    try {
        const response = await anthropic.messages.create({
            model: PREFILTER_CONFIG.HAIKU_MODEL,
            max_tokens: PREFILTER_CONFIG.HAIKU_MAX_TOKENS,
            temperature: PREFILTER_CONFIG.HAIKU_TEMPERATURE,
            messages: [{
                role: 'user',
                content: `You are a classifier for a weather assistant that ONLY provides weather forecasts and alerts for US locations.

Available capabilities:
- Get weather forecasts (requires latitude/longitude)
- Get weather alerts (requires US state code)

Analyze this user query and respond with ONLY "YES" if it's asking about weather, or "NO" if it's asking about anything else.

User query: "${userMessage}"

Answer (YES or NO):`
            }]
        });

        const answer = response.content[0]?.text?.trim().toUpperCase();
        const isWeatherQuery = answer === 'YES';

        console.log(`Haiku classification: ${answer} for query: "${userMessage}"`);

        return {
            isWeatherQuery,
            confidence: 'medium'
        };
    } catch (error) {
        console.error('Haiku classification error:', error);
        // On error, default to allowing the query (fail open)
        return {
            isWeatherQuery: true,
            confidence: 'low',
            error: error.message
        };
    }
}

// Hybrid weather query classifier
export async function checkIfWeatherQuery(anthropic, userMessage) {
    const message = userMessage.toLowerCase().trim();

    // STEP 1: Keyword matching for obvious weather queries (instant, zero cost)
    const weatherKeywords = [
        // Direct weather terms
        'weather', 'forecast', 'temperature', 'temp', 'rain', 'snow', 'wind',
        'storm', 'sunny', 'cloudy', 'precipitation', 'humidity', 'conditions',

        // Weather phenomena
        'hurricane', 'tornado', 'thunderstorm', 'hail', 'fog', 'frost',
        'lightning', 'flood', 'drought', 'heatwave', 'blizzard',

        // Weather-related questions
        'hot', 'cold', 'warm', 'cool', 'freezing', 'raining', 'snowing',

        // Alerts and warnings
        'alert', 'warning', 'advisory', 'watch',

        // Time-based weather queries
        'today', 'tonight', 'tomorrow', 'weekend', 'week',

        // Location indicators (when combined with weather context)
        'outside', 'outdoors'
    ];

    const nonWeatherKeywords = [
        // Programming/tech (strong negative signals)
        'react', 'javascript', 'python', 'code', 'programming', 'function',
        'install', 'npm', 'pip', 'docker', 'api', 'database', 'sql',
        'component', 'typescript', 'node', 'package', 'import', 'export',

        // General questions (strong negative signals)
        'tutorial', 'learn', 'explain', 'define',
        'calculate', 'math', 'recipe', 'cook', 'movie', 'song', 'book'
    ];

    // Check for strong non-weather signals first
    const hasNonWeatherKeyword = nonWeatherKeywords.some(kw => message.includes(kw));
    if (hasNonWeatherKeyword) {
        console.log('Pre-filter: Strong non-weather keyword detected');
        return { isWeatherQuery: false, confidence: 'high' };
    }

    // Check for weather keywords
    const hasWeatherKeyword = weatherKeywords.some(kw => message.includes(kw));
    if (hasWeatherKeyword) {
        console.log('Pre-filter: Weather keyword detected');
        return { isWeatherQuery: true, confidence: 'high' };
    }

    // STEP 2: Pattern matching for location-based queries
    // Matches "in [location]", "at [location]", "[location] weather"
    const locationPatterns = [
        /\b(in|at|for)\s+[A-Z][a-z]+/,  // "in Seattle", "at Portland"
        /\b[A-Z]{2}\b/,                   // State codes: "CA", "NY"
        /\blatitude|longitude|lat|long|coordinates?\b/i
    ];

    const hasLocationPattern = locationPatterns.some(pattern => pattern.test(userMessage));
    if (hasLocationPattern) {
        console.log('Pre-filter: Location pattern detected, checking with Haiku');
        // Ambiguous - could be "restaurants in Seattle" or "weather in Seattle"
        return await classifyWithHaiku(anthropic, userMessage);
    }

    // STEP 3: Very short queries (ambiguous)
    if (message.split(/\s+/).length <= 3) {
        console.log('Pre-filter: Short query, checking with Haiku');
        return await classifyWithHaiku(anthropic, userMessage);
    }

    // STEP 4: No clear signals - use Haiku for classification
    console.log('Pre-filter: No clear signals, checking with Haiku');
    return await classifyWithHaiku(anthropic, userMessage);
}

// Generate a helpful rejection message for non-weather queries
export function generateRejectionMessage() {
    return `I'm a specialized weather assistant for US locations. I can only help with:

🌤️ **Weather Forecasts**
   • "What's the weather in San Francisco?"
   • "Forecast for Seattle, WA"
   • "Temperature for coordinates 37.7749, -122.4194"

⚠️ **Weather Alerts**
   • "Any weather alerts for California?"
   • "Show alerts for TX"
   • "Weather warnings in New York"

For other questions, please try a general-purpose AI assistant. How can I help with weather?`;
}
