import { useEffect, useState } from "react"

export interface AlertProps {
    text: string
}

const ALERT_CLEAR_SEC: number = 2;

export default function Alert({ text }: { text: string }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout | undefined;
        if (text) {
            setVisible(true);
            timeout = setTimeout(() => {
                setVisible(false);
            }, ALERT_CLEAR_SEC * 1000);
        }
        return () => clearTimeout(timeout);
    }, [text]);

    return (
        <div
            className="notification"
            style={{ opacity: visible ? '1' : '0' }}
        >
            <p>{text}</p>
        </div>
    );
}