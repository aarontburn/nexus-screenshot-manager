export function getImageDimensions(base64String: string): Promise<{ w: number, h: number }> {
    return new Promise(function (resolved, _) {
        const i = new Image()
        i.onload = function () {
            resolved({ w: i.width, h: i.height })
        };
        i.src = 'data:image/png;base64,' + base64String
    });
}