import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CircularProgress, Button, TextField, Box } from '@mui/material';
import './ChatComponent.css';
import { EventSourcePolyfill } from 'event-source-polyfill';

const ChatComponent = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(null); // 添加 countdown 状态
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = useCallback(async () => {
        if (!inputMessage.trim()) return;

        const newMessages = [...messages, { role: 'USER', content: inputMessage }];
        setMessages(newMessages);
        setInputMessage("");
        setIsLoading(true);

        let assistantMessage = { role: 'ASSISTANT', content: '' };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);

        const token = localStorage.getItem('token');
        const eventSource = new EventSourcePolyfill(`http://127.0.0.1:8080/ollama/stream?message=${encodeURIComponent(inputMessage)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        eventSource.onmessage = (event) => {
            const parsedData = JSON.parse(event.data);
            if (parsedData.error) {
                console.error('Error:', parsedData.error);
                localStorage.removeItem('token'); // 删除本地 token
                let countdownValue = 6;
                const content = `Error: ${parsedData.error}. 将在 ${countdownValue} 秒后刷新重新登录...`;
                assistantMessage.content += content;
                setMessages(prevMessages => [...prevMessages]);

                setCountdown(countdownValue);
                const countdownInterval = setInterval(() => {
                    countdownValue -= 1;
                    setCountdown(countdownValue);
                    if (countdownValue <= 0) {
                        clearInterval(countdownInterval);
                        window.location.reload();
                    }
                }, 1000);
            } else {
                const content = parsedData.result.output.content;
                assistantMessage.content += content;
                setMessages(prevMessages => [...prevMessages]);
            }
        };

        eventSource.onerror = (error) => {
            console.error("Error in EventSource:", error);
            eventSource.close();
            setIsLoading(false);
        };

        eventSource.onopen = () => {
            setIsLoading(false);
        };

        return () => {
            eventSource.close();
        };
    }, [inputMessage, messages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    const components = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter style={materialDark} language={match[1]} PreTag="div" {...props}>
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
    };

    return (
        <Box display="flex" flexDirection="column" height="100vh">
            <Box ref={messagesContainerRef} flex="1" overflow="auto" className="message-container">
                {messages.map((msg, index) => (
                    <Box key={index} className={`message ${msg.role.toLowerCase()}`} p={1} mb={1} borderRadius={4} bgcolor={msg.role === 'USER' ? '#e1f5fe' : '#fff8e1'}>
                        <ReactMarkdown components={components}>
                            {msg.content}
                        </ReactMarkdown>
                    </Box>
                ))}
                {isLoading && <CircularProgress />}
                {countdown !== null && (
                    <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                        <span style={{ fontWeight: 'bold', color: 'red' }}>还剩{countdown}秒 ...</span>
                        <Button variant="contained" color="secondary" onClick={() => window.location.reload()} style={{ marginLeft: '10px' }}>
                            立即刷新
                        </Button>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" p={1} className="input-container">
                <TextField
                    fullWidth
                    variant="outlined"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isLoading}
                    label="Type your message"
                    multiline
                    rows={2}
                    onKeyPress={handleKeyPress}
                />
                <Button variant="contained" color="primary" onClick={sendMessage} disabled={isLoading} style={{ marginLeft: '10px' }}>
                    Send
                </Button>
            </Box>
        </Box>
    );
};

export default ChatComponent;
