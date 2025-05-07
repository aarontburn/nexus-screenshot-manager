import { sendToProcess } from "../nexus-bridge"

export interface ImageOverlayProps {
    imagePath: string
}


export default function ImageOverlay({ imagePath }: ImageOverlayProps) {
    return <div className={`image-overlay`} id={`${imagePath}-overlay`}>
        <div
            onClick={(() => sendToProcess('trash-button', imagePath))}
            className="icon image-option trash-icon">
        </div>

        <div
            onClick={(() => sendToProcess('copy-button', imagePath))}
            className="icon image-option copy-icon">
        </div>

        <div
            onClick={(() => sendToProcess('external-button', imagePath))}
            className="icon image-option external-icon">
        </div>
    </div>
}