import { useEffect } from 'react';
import "./agent-query.css";
export default function AgentQuery() {
    useEffect(() => {
        console.log("Agent Query")
    }, []);

    return (
        <div>
            <h3>Agent Query</h3>
        </div>
    );
}