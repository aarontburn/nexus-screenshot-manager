import { sendToProcess } from "../nexus-bridge"

export interface ImageOverlayProps {
    imagePath: string,
    onImageTrashed: (path: string) => void;
    onImageCopied: (path: string) => void;
}


export default function ImageOverlay({ imagePath, onImageTrashed, onImageCopied }: ImageOverlayProps) {
    return <div className={`image-overlay`} id={`${imagePath}-overlay`}>
        <div
            onClick={() => {
                onImageTrashed(imagePath);
                sendToProcess('trash-button', imagePath)
            }}
            className="icon image-option trash-icon">
        </div>

        <div
            onClick={() => {
                onImageCopied(imagePath);
                sendToProcess('copy-button', imagePath);
            }}
            className="icon image-option copy-icon">
        </div>

        <div
            onClick={(() => sendToProcess('external-button', imagePath))}
            className="icon image-option external-icon">
        </div>
    </div>
}