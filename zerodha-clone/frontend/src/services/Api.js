const BASE_URL = 'http://localhost:8000';

export const api = {
    getStocks: async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/stocks`);
            if (!response.ok) throw new Error('Failed to fetch stocks');
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    getStockData: async (symbol, duration = '1d') => {
        try {
            const response = await fetch(`${BASE_URL}/api/stock/${symbol}?duration=${duration}`);
            if (!response.ok) throw new Error('Failed to fetch stock data');
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    connectWebSocket: (symbol, onMessage, onError) => {
        if (!symbol) return null;
        
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const baseDelay = 1000;
        let reconnectTimeout = null;

        const connect = () => {
            ws = new WebSocket(`ws://${BASE_URL.replace('http://', '')}/ws/${symbol}`);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                    reconnectAttempts = 0; // Reset attempts on successful message
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (onError) onError(error);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                attemptReconnect();
            };

            ws.onopen = () => {
                console.log('WebSocket connected');
                reconnectAttempts = 0;
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
            };
        };

        const attemptReconnect = () => {
            if (reconnectAttempts >= maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                return;
            }

            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts + 1})`);

            reconnectTimeout = setTimeout(() => {
                reconnectAttempts++;
                connect();
            }, delay);
        };

        connect();

        return {
            close: () => {
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                if (ws) {
                    ws.close();
                }
            },
            reconnect: () => {
                reconnectAttempts = 0;
                if (ws) {
                    ws.close();
                }
                connect();
            }
        };
    }
};