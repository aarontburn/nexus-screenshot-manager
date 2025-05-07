import { useEffect, useState } from 'react'
import './App.css'
import { addProcessListener, sendToProcess } from './nexus-bridge';
import { RowsPhotoAlbum } from "react-photo-album"
import "react-photo-album/rows.css"
import { getImageDimensions } from './utils/image';
import ImageOverlay from './components/ImageOverlay';
import Alert from './components/Notification';


export interface ImageDetails {
    path: string;
    fileName: string;
    base64: string;
    width: number;
    height: number;
}

function App() {
    const [pathsMap, setPathsMap] = useState<{ [path: string]: ImageDetails }>({});
    const [mostRecentImage, setMostRecentImage] = useState<ImageDetails | undefined>(undefined);
    const [directory, setDirectory] = useState<string>('');

    const [alertText, setAlertText] = useState<string>('');
    const [version, setVersion] = useState(0);
    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        const listener = addProcessListener((eventType: string, data: any[]) => {
            switch (eventType) {
                case "accent-color-changed": {
                    document.documentElement.style.cssText = "--accent-color: " + data[0];
                    break;
                }

                case 'directory': {
                    setDirectory(data[0]);
                    break;
                }

                case "initial-file": {
                    const { path, base64 } = data[0] as ImageDetails;
                    getImageDimensions(base64).then(({ w, h }) => {
                        setPathsMap(prev => ({
                            [path]: { ...data[0], width: w, height: h },
                            ...prev,
                        }));
                    });
                    break;
                }

                case 'file-created': {
                    const { path, base64 } = data[0] as ImageDetails;
                    getImageDimensions(base64).then(({ w, h }) => {
                        const image = { ...data[0], width: w, height: h };
                        setPathsMap(prev => ({
                            [path]: image,
                            ...prev
                        }));
                        setMostRecentImage(_prev => {
                            return image;
                        });
                    });
                    break;
                }

                case 'file-deleted': {
                    const { path } = data[0];
                    setPathsMap(prev => {
                        const updated = { ...prev };
                        delete updated[path];
                        return updated;
                    });
                    break;
                }

                default: {
                    console.log("Uncaught message: " + eventType + " | " + data)
                    break;
                }
            }
        });

        sendToProcess("init");

        return () => window.removeEventListener("message", listener);
    }, []);

    const onImageHover = (target: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const imagePath: string = (target.target as HTMLImageElement).title;
        const element: HTMLElement | null = document.getElementById(imagePath + "-overlay");
        if (element) {
            element.classList.add("visible-image");
        }
    }

    const onImageExit = () => {
        Array.from(document.getElementsByClassName("visible-image"))
            .forEach(e => e.classList.remove("visible-image"));
    }

    const onImageTrashed = (path: string) => {
        setAlertText(`Moved ${path} to the recycle bin.`);
        forceUpdate();
    }

    const onImageCopied = (path: string) => {
        setAlertText(`Copied ${path} to clipboard.`);
        forceUpdate();
    }

    return (
        <>
            <div id='notification-area'>
                <Alert key={version} text={alertText} />
            </div>

            <div id='recent-image'>
                <h2>Last Taken Screenshot</h2>

                {!mostRecentImage && <>
                    <p>Your last taken screenshot will appear here.</p>
                </>}

                {mostRecentImage && <>
                    <img src={'data:image/png;base64,' + mostRecentImage.base64}
                    ></img>
                    <div id='recent-image-control'>
                        <div
                            onClick={() => {
                                setMostRecentImage(undefined);
                                onImageTrashed(mostRecentImage.path);
                                sendToProcess('trash-button', mostRecentImage.path);
                            }}
                            className="icon image-option trash-icon">
                        </div>

                        <div
                            onClick={(() => {
                                onImageCopied(mostRecentImage.path);
                                sendToProcess('copy-button', mostRecentImage.path)
                            })}
                            className="icon image-option copy-icon">
                        </div>

                        <div
                            onClick={(() => sendToProcess('external-button', mostRecentImage.path))}
                            className="icon image-option external-icon">
                        </div>
                    </div>
                </>}
            </div>


            <div id='library-header'>
                <div style={{ display: "flex", alignContent: "center", justifyContent: "center", alignItems: "center" }}>
                    <div id='folder-icon' className='icon' onClick={() => sendToProcess("open-folder")}></div>
                    <h2>{directory || 'Library'}</h2>
                </div>

                <button onClick={(() => sendToProcess("empty-folder"))}>Empty Folder</button>
            </div>

            <div id='album-container'>
                {Object.keys(pathsMap).length === 0 && <>
                    <p>No images found.</p>
                </>}

                <RowsPhotoAlbum
                    render={{
                        extras: (_, context) => <>
                            <ImageOverlay imagePath={context.photo.title} onImageCopied={onImageCopied} onImageTrashed={onImageTrashed} />
                        </>
                    }}
                    rowConstraints={{ singleRowMaxHeight: 600 }}
                    componentsProps={() => ({
                        wrapper: { onMouseEnter: onImageHover, onMouseLeave: onImageExit },
                    })}
                    photos={Object.values(pathsMap).map(details => ({
                        src: 'data:image/png;base64,' + details.base64,
                        width: details.width,
                        height: details.height,
                        title: details.path
                    }))} />
            </div>
        </>
    )
}

export default App
