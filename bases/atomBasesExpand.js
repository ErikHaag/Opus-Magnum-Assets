// @ts-check
import { colorToHex } from "../symbols/atomSymbolsExpand.js";
export { loadAtomBases, unpackAtomBases };

/**
 * @typedef {object} LoadAtomBasesOptions
 * @prop {string=} location
 * 
 * @typedef {object} UnpackAtomBaseOptions
 * @prop {0|1=} mode
 */

/**
 * 
 * @param {SVGElement} destinationElement 
 * @param {LoadAtomBasesOptions} options 
 */
async function loadAtomBases(destinationElement, options = {}) {
    let error = "";
    if (!(destinationElement instanceof Element)) {
        error += "Destination must be an element.\n";
    }

    let baseUrl = options.location ?? "https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/bases/templates.svg";
    if (typeof (baseUrl) != "string") {
        error += "Location must be a string or nullish.\n";
    }

    if (error.length != 0) {
        throw new Error(error);
    }

    let response = await fetch(baseUrl);
    let xml = await response.text();
    let data = /(<g[\s\S]+<\/g>)/.exec(xml)?.[1] ?? "";

    let elementStack = [destinationElement];
    let writingProperties = false;
    let counter = data.length;
    const unmatchedQuoteError = new Error("Unmatched quotes.");

    o: while (counter > 0) {
        counter--;
        data = data.trimStart();
        if (data.length == 0) {
            break;
        }
        let peeked = elementStack.at(-1);
        if (peeked == undefined) {
            throw new Error("This is in principle unreachable... the heck?");
        }
        let elemType = peeked.tagName.toLowerCase();
        if (!writingProperties) {
            for (let tag of ["circle", "g", "path"]) {
                if (data.startsWith("<" + tag)) {
                    let elem = document.createElementNS("http://www.w3.org/2000/svg", tag);
                    peeked.appendChild(elem);
                    elementStack.push(elem);
                    data = data.substring(tag.length + 1);
                    writingProperties = true;
                    continue o;
                }
            }
            if (data.startsWith("</g>")) {
                elementStack.pop();
                data = data.substring(4);
                continue;
            }
            throw new Error(`During tag reading, found unknown token: ${data.substring(0, 20)}`);
        }
        if (elemType == "circle") {
            for (let coord of ["cx", "cy"]) {
                if (data.startsWith(coord + "=\"")) {
                    let coordEnd = data.indexOf("\"", 4);
                    if (coordEnd == -1) {
                        throw unmatchedQuoteError;
                    }
                    peeked.setAttribute(coord, data.substring(4, coordEnd));
                    data = data.substring(coordEnd + 1);
                    continue o;
                }
            }
            if (data.startsWith("r=\"")) {
                let rEnd = data.indexOf("\"", 3);
                if (rEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("r", data.substring(3, rEnd));
                data = data.substring(rEnd + 1);
                continue;
            }
        }
        if (elemType == "g") {
            if (data.startsWith("id=\"")) {
                let idEnd = data.indexOf("\"", 4);
                if (idEnd == -1) {
                    throw unmatchedQuoteError;
                }
                let id = data.substring(4, idEnd);
                if (!/^OMA_B_[a-z]+(?:_[a-z]+)*__[a-z]+(?:_[a-z]+)*$/.test(id)) {
                    throw new Error(`Invalid Id: ${id}`);
                }
                peeked.id = id;
                data = data.substring(idEnd + 1);
                continue;
            }
            if (data.startsWith(">")) {
                data = data.substring(1);
                writingProperties = false;
                continue;
            }
        }
        if (elemType == "path") {
            if (data.startsWith("d=\"")) {
                let dEnd = data.indexOf("\"", 3);
                if (dEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("d", data.substring(3, dEnd));
                data = data.substring(dEnd + 1);
                continue;
            }
            if (data.startsWith("stroke=\"")) {
                let strokeEnd = data.indexOf("\"", 8);
                if (strokeEnd == -1) {
                    throw unmatchedQuoteError;
                }
                let stroke = data.substring(8, strokeEnd);
                if (!/^var\(--OMA-BC?-[a-z]+(?:-[a-z]+)*--[a-z]+(?:-[a-z]+)*\)$/.test(stroke)) {
                    throw new Error("Invalid stroke: " + stroke);
                }
                peeked.setAttribute("stroke", stroke);
                data = data.substring(strokeEnd + 1);
                continue;
            }
            if (data.startsWith("stroke-width=\"")) {
                let strokeWidthEnd = data.indexOf("\"", 14);
                if (strokeWidthEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("stroke-width", data.substring(14, strokeWidthEnd));
                data = data.substring(strokeWidthEnd + 1);
                continue;
            }
        }
        if (["circle", "path"].includes(elemType)) {
            if (data.startsWith("fill=\"")) {
                let fillEnd = data.indexOf("\"", 6);
                if (fillEnd == -1) {
                    throw unmatchedQuoteError;
                }
                let fill = data.substring(6, fillEnd);
                if (!(fill == "none" || /^var\(--OMA-BC?-[a-z]+(?:-[a-z]+)*--[a-z]+(?:-[a-z]+)*\)$/.test(fill))) {
                    throw new Error("Invalid fill: " + fill);
                }
                peeked.setAttribute("fill", fill);
                data = data.substring(fillEnd + 1);
                continue;
            }
            if (data.startsWith("/>")) {
                elementStack.pop();
                writingProperties = false;
                data = data.substring(2);
                continue;
            }
        }
        throw new Error(`During property reading of a ${elemType} element, found unknown token: ${data.substring(0, 20)}`);
    }
}

/**
 * @param {SVGElement} destinationElement 
 * @param {UnpackAtomBaseOptions} options 
 */
function unpackAtomBases(destinationElement, options = {}) {
    let error = "";

    let mode = options.mode ?? 0;
    if (typeof (mode) != "number") {
        error += "Mode must be a number or nullish.\n";
    }

    if (error.length != 0) {
        throw new Error(error);
    }

    let styles = window.getComputedStyle(document.body);
    let stylesList = Array.from(styles).filter((s) => s.startsWith("--OMA-B-") && s != "--OMA-B-default-color").map((s) => s.substring(8)).sort();

    let i = 0;

    let disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    destinationElement.append(disk);
    let diskStyles = window.getComputedStyle(disk);

    for (let atomName of stylesList) {
        let n = atomName.replaceAll("-", "_");
        let elem = destinationElement.querySelector(":scope #OMA_B_" + n);
        if (elem == null) {
            elem = document.createElementNS("http://www.w3.org/2000/svg", "g");
            elem.id = "OMA_B_" + n;
        } else if (mode >= 1) {
            for (let p of elem.children) {
                disk.style.fill = p.getAttribute("fill") ?? "#000000";
                p.setAttribute("fill", colorToHex(diskStyles.fill));
                disk.style.fill = p.getAttribute("stroke") ?? "none";
                p.setAttribute("stroke", colorToHex(diskStyles.fill));
            }
        }
        destinationElement.appendChild(elem);
        let color = `var(--OMA-B-${atomName})`;

        if (mode >= 1) {
            disk.style.fill = color;
            color = colorToHex(diskStyles.fill);
        }

        let baseCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        elem.insertAdjacentElement("afterbegin", baseCircle);
        baseCircle.setAttribute("cx", "30");
        baseCircle.setAttribute("cy", "30");
        baseCircle.setAttribute("r", "30");
        baseCircle.setAttribute("stroke", "none");
        baseCircle.setAttribute("fill", color);
    }
    disk.remove();
}