export { expandAtomSymbols, colorToHex };

/**
 * Populates an element with all the atom symbols from Opus Magnum and most of the mods
 * @param {Element} destinationElement 
 * @param {Object} options 
 */
async function expandAtomSymbols(destinationElement, options = {}) {
    let error = "";
    if (!(destinationElement instanceof Element)) {
        error += "Destination must be an element.\n";
    }

    let symbolsURL = options.location ?? "https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/symbols/templates.svg";
    if (typeof (symbolsURL) != "string") {
        error += "location must be a string or nullish.\n";
    }

    // 0 | no post-processing
    // 1 | expand use element and discard sub-components
    // 2 | color symbols using CSS variables.
    // 3 | explicitly assign attributes
    let mode = options.mode ?? 0;
    if (typeof (mode) != "number") {
        error += "mode must be a number or nullish.\n";
    }

    let symbolClass = options.symbolClass ?? "OMA-S";
    if (typeof (symbolClass) != "string") {
        error += "symbolClass must be a string or nullish.\n";
    }

    let outlineClass = options.outlineClass ?? "OMA-SO";
    if (typeof (outlineClass) != "string") {
        error += "outlineClass must be a string or nullish.\n";
    } 

    if (typeof (symbolClass) == "string" && typeof (outlineClass) != "string" && symbolClass === outlineClass) {
        error += "symbolClass and outlineClass must be different.\n"
    }

    let allowOutlines = options.allowOutlines ?? false;
    if (typeof (allowOutlines) != "boolean") {
        error += "allowOutlines must be a boolean or nullish.\n";
    }

    if (error.length != 0) {
        throw new Error(error.trimEnd());
    }

    const response = await fetch(symbolsURL);
    const xml = await response.text();
    let data = /(<g[\s\S]+<\/g>)/.exec(xml)?.[1] ?? "";
    destinationElement.innerHTML = data;
    if (mode >= 1) {
        let useElem;
        while (useElem = destinationElement.querySelector(":scope use")) {
            let parent = useElem.parentElement;
            let reference = destinationElement.querySelector(":scope " + useElem.getAttribute("href"));
            let T = useElem.getAttribute("transform") ?? "";
            for (let c of reference.children) {
                let cClone = c.cloneNode();
                useElem.insertAdjacentElement("beforebegin", cClone);
                let currentT = (T + " " + (c.getAttribute("transform") ?? "")).trim();
                if (currentT != "") {
                    cClone.setAttribute("transform", currentT);
                }
            }
            useElem.remove();
        }

        for (let i = destinationElement.childElementCount - 1; i >= 0; i--) {
            let elem = destinationElement.children[i];
            if (elem.id.startsWith("OMA_SC_")) {
                elem.remove();
                i--;
                continue;
            }
            if (allowOutlines && elem.classList.contains("outline")) {
                let fragment = document.createDocumentFragment();
                for (let c of elem.children) {
                    let cClone = c.cloneNode();
                    cClone.setAttribute("stroke-width", Number.parseFloat(cClone.getAttribute("stroke-width")) + 2);
                    cClone.classList.add(outlineClass);
                    fragment.appendChild(cClone);
                }


                elem.prepend(fragment);
            }

        }
    }
    
    let styles;
    let strokeStyles;
    if (mode >= 2) {
        styles = window.getComputedStyle(document.body);
        strokeStyles = Array.from(styles).filter((s) => s.startsWith("--OMA-S-") && s != "--OMA-S-default-color").map((s) => s.substring(8));
        let disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        destinationElement.append(disk);
        let outlineColor = "var(--OMA-S-outline-color)";
        if (mode >= 3) {
            disk.style.fill = outlineColor;
            outlineColor = colorToHex(window.getComputedStyle(disk).fill);
        }
        for (let atom of destinationElement.children) {
            let id = atom.id.substring(6).replaceAll("_", "-");
            let color = "var(--OMA-S-" + (strokeStyles.includes(id) ? id : "default-color") + ")";
            if (mode >= 3) {
                disk.style.fill = color;
                color = colorToHex(window.getComputedStyle(disk).fill);
            }
            for (let elem of atom.children) {
                if (["circle", "ellipse", "line", "path"].includes(elem.tagName)) {
                    if (elem.classList.contains(outlineClass)) {
                        elem.setAttribute("fill", "none");
                        elem.setAttribute("stroke", outlineColor);
                        elem.setAttribute("stroke-linecap", "square");
                    } else {
                        elem.setAttribute("fill", elem.classList.contains("fill") ? color : "none");
                        elem.setAttribute("stroke", color);
                    }
                }
            }
        }
        disk.remove();
    }
    for (let elem of destinationElement.children) {
        if (elem.id.startsWith("OMA_S_")) {
            elem.classList.add(symbolClass);
        }
    }
}

function colorToHex(color) {
    if (color == "none" || color.startsWith("url(")) {
        return color;
    }
    let red = -1;
    let green = -1;
    let blue = -1;
    if (color.startsWith("rgb(")) {
        [red, green, blue] = color.substring(4, color.length - 1).split(",").map((e) => Number.parseFloat(e.trim()));
    }

    if (color.startsWith("color(srgb")) {
        [red, green, blue] = color.substring(11, color.length - 1).split(" ").map(e => 255 * Number.parseFloat(e.trim()));
    }

    if (red == -1 || green == -1 || blue == -1) {
        throw new Error("Unknown color \"" + color + "\"");
    }

    function clamp(i) {
        if (i < 0n) {
            return 0n;
        } else if (i > 255n) {
            return 255n;
        }
        return i;
    }

    // hex codes are well known and sufficient in most applications.
    red = clamp(BigInt(Math.round(red)));
    green = clamp(BigInt(Math.round(green)));
    blue = clamp(BigInt(Math.round(blue)));
    /*
    if (red % 17n == 0n && green % 17n == 0n && blue % 17n == 0n) {
        // compact form!
        return "#" + red.toString(16)[0] + green.toString(16)[0] + blue.toString(16)[0];
    }
    */
    // force three hex digits
    red += 0x100n;
    green += 0x100n;
    blue += 0x100n;
    // then chop off the first one
    return "#" + red.toString(16).substring(1) + green.toString(16).substring(1) + blue.toString(16).substring(1);
}