import { colorToHex } from "../symbols/atomSymbolsExpand.js";
export { expandAtomBases };

/**
 * 
 * @param {Element} destinationElement 
 * @param {Object} options 
 */
async function expandAtomBases(destinationElement, options = {}) {
    let error = "";
    if (!(destinationElement instanceof Element)) {
        error += "Destination must be an element.\n";
    }

    let baseUrl = options.location ?? "https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/bases/templates.svg";
    if (typeof (baseUrl) != "string") {
        error += "Location must be a string or nullish.\n";
    }

    let mode = options.mode ?? 0;
    if (typeof (mode) != "number") {
        error += "Mode must be a number or nullish.\n";
    }

    if (error.length != 0) {
        throw new Error(error);
    }

    let response = await fetch(baseUrl);
    let xml = await response.text();
    let data = /(<g[\s\S]+<\/g>)/.exec(xml)?.[1] ?? "";
    destinationElement.innerHTML = data;

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