import * as path from "path";
import { DataResponse, Process, Setting } from "@nexus-app/nexus-module-builder";
import { StringSetting } from "@nexus-app/nexus-module-builder/settings/types";
import * as fs from 'fs';
import * as os from 'os';
import { basename } from "path";
import chokidar, { FSWatcher } from 'chokidar';
import { clipboard, nativeImage, shell } from "electron";

import pLimit from 'p-limit';
const limit = pLimit(5);

// These is replaced to the ID specified in export-config.js during export. DO NOT MODIFY.
const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");
const ICON_PATH: string = path.join(__dirname, "./icon.png")


export default class ModuleProcess extends Process {

    public constructor() {
        super({
            moduleID: MODULE_ID,
            moduleName: MODULE_NAME,
            paths: {
                htmlPath: HTML_PATH,
                iconPath: ICON_PATH
            },
        });
    }

    private watcher: FSWatcher;

    public async initialize(): Promise<void> {
        super.initialize(); // This should be called.

        this.requestExternal("nexus.Settings", "get-accent-color").then((value: DataResponse) =>
            this.sendToRenderer("accent-color-changed", value.body));


        const pictureDir: string = path.normalize(this.getSettings().findSetting('ssdir').getValue() as string);
        console.log(`[${MODULE_NAME}] Watching path: ${pictureDir}`)
        this.watcher?.removeAllListeners()

        this.watcher = chokidar.watch(pictureDir, {
            ignoreInitial: true,
            persistent: true,
            awaitWriteFinish: true
        });

        this.sendToRenderer('directory', pictureDir);


        this.watcher.on('add', async (filePath: string) => {
            if (filePath.endsWith('.png')) {
                this.sendToRenderer('file-created', {
                    path: filePath,
                    fileName: basename(filePath),
                    base64: await this.imageToBase64(filePath)
                })
            }

        });
        this.watcher.on('unlink', async (filePath: string) => {
            if (filePath.endsWith('.png')) {
                this.sendToRenderer('file-deleted', {
                    path: filePath,
                });
            }
        });
        const currentFiles: string[] = await fs.promises.readdir(pictureDir);

        const results = await Promise.allSettled(
            currentFiles.map(fileName =>
                limit(() => this.imageToBase64(path.join(pictureDir, fileName))
                    .then(base64 => {
                        this.sendToRenderer('initial-file', {
                            path: path.join(pictureDir, fileName),
                            fileName: fileName,
                            base64: base64
                        });
                    }))
            )
        );
    }


    private async imageToBase64(imagePath: string): Promise<string | null> {
        try {
            return fs.promises.readFile(imagePath, { encoding: 'base64' });
        } catch (error) {
            console.error("Error converting image to Base64:", error);
            return null;
        }
    }




    // Receive events sent from the renderer.
    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
                break;
            }
            case 'external-button': {
                const path: string = data[0];
                shell.openPath(path)
                    .then(result => {
                        if (result) {
                            console.error('Failed to open image:', result);
                        }
                    });
                break;
            }

            case 'open-folder': {
                shell.openPath(this.getSettings().findSetting('ssdir').getValue() as string);
                break;
            }
            case "trash-button": {
                const filePath: string = data[0];
                shell.trashItem(filePath)
                break;
            }
            

            case "copy-button": {
                const filePath: string = data[0];
                clipboard.writeImage(nativeImage.createFromPath(filePath));
                console.info(`[${MODULE_NAME}] Copied ${filePath} to clipboard`)
                break;
            }

            default: {
                console.info(`[${MODULE_NAME}] Unhandled event: eventType: ${eventType} | data: ${data}`);
                break;
            }
        }
    }

    // Add settings/section headers.
    public registerSettings(): (Setting<unknown> | string)[] {
        return [
            new StringSetting(this)
                .setName('Screenshot Directory')
                .setDescription("The directory where your screenshots are saved.")
                .setDefault(path.normalize(`${os.homedir()}/Pictures/Screenshots/`))
                .setAccessID("ssdir")
                .setValidator(s => (s as string).replace(/\\\\/g, '/'))
        ];
    }

    // Fired whenever a setting is modified.
    public async onSettingModified(modifiedSetting: Setting<unknown>): Promise<void> {

    }



}