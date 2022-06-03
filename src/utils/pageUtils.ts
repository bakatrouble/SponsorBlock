import { ActionType, Category, SponsorSourceType, SponsorTime, VideoID } from "../types";
import { GenericUtils } from "./genericUtils";

export function getControls(): HTMLElement {
    const controlsSelectors = [
        // YouTube
        ".ytp-right-controls",
        // Mobile YouTube
        ".player-controls-top",
        // Invidious/videojs video element's controls element
        ".vjs-control-bar",
    ];

    for (const controlsSelector of controlsSelectors) {
        const controls = document.querySelectorAll(controlsSelector);

        if (controls && controls.length > 0) {
            return <HTMLElement> controls[controls.length - 1];
        }
    }

    return null;
}

export function isVisible(element: HTMLElement): boolean {
    return element && element.offsetWidth > 0 && element.offsetHeight > 0;
}

export function findValidElementFromSelector(selectors: string[]): HTMLElement {
    return findValidElementFromGenerator(selectors, (selector) => document.querySelector(selector));
}

export function findValidElement(elements: HTMLElement[] | NodeListOf<HTMLElement>): HTMLElement {
    return findValidElementFromGenerator(elements);
}

function findValidElementFromGenerator<T>(objects: T[] | NodeListOf<HTMLElement>, generator?: (obj: T) => HTMLElement): HTMLElement {
    for (const obj of objects) {
        const element = generator ? generator(obj as T) : obj as HTMLElement;
        if (element && isVisible(element)) {
            return element;
        }
    }

    return null;
}

export function getHashParams(): Record<string, unknown> {
    const windowHash = window.location.hash.slice(1);
    if (windowHash) {
        const params: Record<string, unknown> = windowHash.split('&').reduce((acc, param) => {
            const [key, value] = param.split('=');
            const decoded = decodeURIComponent(value);
            try {
                acc[key] = decoded?.match(/{|\[/) ? JSON.parse(decoded) : value;
            } catch (e) {
                console.error(`Failed to parse hash parameter ${key}: ${value}`);
            }

            return acc;
        }, {});

        return params;
    }

    return {};
}

export function getExistingChapters(currentVideoID: VideoID, duration: number): SponsorTime[] {
    const chaptersBox = document.querySelector("ytd-macro-markers-list-renderer");

    const chapters: SponsorTime[] = [];
    if (chaptersBox) {
        let lastSegment: SponsorTime = null;
        const links = chaptersBox.querySelectorAll("ytd-macro-markers-list-item-renderer > a");
        for (const link of links) {
            const timeElement = link.querySelector("#time") as HTMLElement;
            const description = link.querySelector("#details h4") as HTMLElement;
            if (timeElement && description?.innerText?.length > 0 && link.getAttribute("href")?.includes(currentVideoID)) {
                const time = GenericUtils.getFormattedTimeToSeconds(timeElement.innerText);
                
                if (lastSegment) {
                    lastSegment.segment[1] = time;
                    chapters.push(lastSegment);
                }
                
                lastSegment = {
                    segment: [time, null],
                    category: "chapter" as Category,
                    actionType: ActionType.Chapter,
                    description: description.innerText,
                    source: SponsorSourceType.YouTube,
                    UUID: null
                };
            }
        }

        if (lastSegment) {
            lastSegment.segment[1] = duration;
            chapters.push(lastSegment);
        }
    }

    return chapters;
}

export function localizeHtmlPage(): void {
    //Localize by replacing __MSG_***__ meta tags
    const localizedTitle = getLocalizedMessage(document.title);
    if (localizedTitle) document.title = localizedTitle;

    const body = document.querySelector(".sponsorBlockPageBody");
    const localizedMessage = getLocalizedMessage(body.innerHTML.toString());
    if (localizedMessage) body.innerHTML = localizedMessage;
}

export function getLocalizedMessage(text: string): string | false {
    const valNewH = text.replace(/__MSG_(\w+)__/g, function(match, v1) {
        return v1 ? chrome.i18n.getMessage(v1).replace(/</g, "&#60;")
            .replace(/"/g, "&quot;").replace(/\n/g, "<br/>") : "";
    });

    if (valNewH != text) {
        return valNewH;
    } else {
        return false;
    }
}