"use client";

import React, { useState, useRef, useEffect } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput,
    TypingIndicator
} from '@chatscope/chat-ui-kit-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface StreamDelta {
    text?: string;
}

interface StreamResponse {
    delta?: StreamDelta;
}

function ChatbotUi(): React.ReactElement {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messageListRef = useRef<any>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollToBottom();
        }
    }, [messages]);

    const handleSend = async (message: string) => {
        if (!message.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: message };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages })
            });

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

            // Add empty assistant message to show typing indicator
            const messagesWithAssistant = [...newMessages, { role: 'assistant' as const, content: '' }];
            setMessages(messagesWithAssistant);

            while (true) {
                const { done, value } = await reader.read();
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

                                // Update the assistant message in real-time
                                setMessages([...newMessages, {
                                    role: 'assistant',
                                    content: assistantMessage
                                }]);
                            }
                        } catch (e) {
                            // Ignore JSON parse errors
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages([...newMessages, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', height: '600px', width: '100%' }}>
            <MainContainer>
                <ChatContainer>
                    <MessageList
                        ref={messageListRef}
                        typingIndicator={isLoading ? <TypingIndicator content="Assistant is thinking..." /> : null}
                    >
                        {messages.map((msg, index) => (
                            <Message
                                key={index}
                                model={{
                                    message: msg.content,
                                    sentTime: new Date().toISOString(),
                                    sender: msg.role === 'user' ? 'You' : 'Assistant',
                                    direction: msg.role === 'user' ? 'outgoing' : 'incoming',
                                    position: 'single'
                                }}
                            />
                        ))}
                    </MessageList>
                    <MessageInput
                        placeholder="Type your message here..."
                        value={inputValue}
                        onChange={(val: string) => setInputValue(val)}
                        onSend={handleSend}
                        disabled={isLoading}
                        attachButton={false}
                    />
                </ChatContainer>
            </MainContainer>
        </div>
    );
}

export default ChatbotUi;
