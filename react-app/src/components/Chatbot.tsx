"use client";

import React, {useState} from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface StreamDelta {
    text?: string;
}

interface StreamResponse {
    delta?: StreamDelta;
}

function Chatbot(): React.ReactElement {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const newMessages: Message[] = [...messages, {role: 'user' as const, content: input}];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({messages: newMessages})
            });

            console.log("response", response);

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;

                        try {
                            const parsed: StreamResponse = JSON.parse(data);
                            if (parsed.delta?.text) {
                                assistantMessage += parsed.delta.text;
                                setMessages([...newMessages, {
                                    role: 'assistant' as const,
                                    content: assistantMessage
                                }]);
                            }
                        } catch (e) {
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot">
            <div className="messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        {msg.content}
                    </div>
                ))}
            </div>
            <div className="input-area">
                <input
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendMessage()}
                    disabled={isLoading}
                    placeholder={"Ask a question or type 'quit' to exit."}
                />
                <button onClick={sendMessage} disabled={isLoading}>
                    Send
                </button>
            </div>
        </div>
    );
}

export default Chatbot;
