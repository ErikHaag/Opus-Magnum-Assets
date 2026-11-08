export { loadAtomSymbols, unpackAtomSymbols, colorToHex };

/**
 * @typedef {object} LoadAtomSymbolsOptions
 * @prop {string=} location
 * 
 * @typedef {object} UnpackAtomSymbolsOptions
 * @prop {0|1|2|3=} mode
 * @prop {string=} symbolClass
 * @prop {string=} outlineClass
 * @prop {boolean=} allowOutlines
 */

/**
 * Populates an element with all the atom symbols from Opus Magnum and most of the mods
 * @param {SVGElement} destinationElement 
 * @param {LoadAtomSymbolsOptions} options 
 */
async function loadAtomSymbols(destinationElement, options = {}) {
    let error = "";
    if (!(destinationElement instanceof Element)) {
        error += "Destination must be an element.\n";
    }

    let symbolsURL = options.location ?? "https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/symbols/templates.svg";
    if (typeof (symbolsURL) != "string") {
        error += "location must be a string or nullish.\n";
    }

    if (error.length != 0) {
        throw new Error(error.trimEnd());
    }

    const response = await fetch(symbolsURL);
    const xml = await response.text();
    let data = xml.substring(xml.indexOf("<g"), xml.lastIndexOf("</g>"));
    data = data.replaceAll("\n", "").replaceAll("\r", "");
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
            for (let tag of ["ellipse", "circle", "g", "line", "path", "use"]) {
                if (data.startsWith("<" + tag)) {
                    data = data.substring(tag.length + 1);
                    let elem = document.createElementNS("http://www.w3.org/2000/svg", tag);
                    if (["ellipse", "circle", "line", "path"].includes(tag)) {
                        elem.setAttribute("stroke-width", 3);
                    }
                    peeked.appendChild(elem);
                    elementStack.push(elem);
                    writingProperties = true
                    continue o;
                }
            }
            if (data.startsWith("</g>")) {
                data = data.substring(4);
                elementStack.pop();
                continue;
            }
            throw new Error(`During tag reading, found unknown token: ${data.substring(0, 20)}`);
        }
        if (elemType == "circle") {
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
                if (!/^OMA_S(?:C|_[a-z]+(?:_[a-z]+)*_)_[a-z]+(?:_[a-z]+)*$/.test(id)) {
                    throw new Error(`Invalid id: ${id}`);
                }
                peeked.id = id;
                data = data.substring(idEnd + 1);
                continue;
            }
            if (data.startsWith(">")) {
                writingProperties = false;
                data = data.substring(1);
                continue;
            }
        }
        if (elemType == "line") {
            for (let coord of ["x1", "x2", "y1", "y2"]) {
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
            if (data.startsWith("stroke-linecap=\"")) {
                let strokeLinecapEnd = data.indexOf("\"", 16);
                if (strokeLinecapEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("stroke-miterlimit", data.substring(16, strokeLinecapEnd));
                data = data.substring(strokeLinecapEnd + 1);
                continue;
            }
            if (data.startsWith("stroke-miterlimit=\"")) {
                let strokeMiterlimitEnd = data.indexOf("\"", 19);
                if (strokeMiterlimitEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("stroke-miterlimit", data.substring(19, strokeMiterlimitEnd));
                data = data.substring(strokeMiterlimitEnd + 1);
                continue;
            }
        }
        if (elemType == "use") {
            if (data.startsWith("href=\"")) {
                let hrefEnd = data.indexOf("\"", 7);
                if (hrefEnd == -1) {
                    throw unmatchedQuoteError;
                }
                let href = data.substring(6, hrefEnd);
                if (!/^#OMA_S(?:C|_[a-z]+(?:_[a-z]+)*_)_[a-z]+(?:_[a-z]+)*$/.test(href)) {
                    throw new Error(`Invalid reference: ${href}`);
                }
                peeked.setAttribute("href", href);
                data = data.substring(hrefEnd + 1);
                continue;
            }
            if (data.startsWith("transform=\"")) {
                let transformEnd = data.indexOf("\"", 11);
                if (transformEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("transform", data.substring(11, transformEnd));
                data = data.substring(transformEnd + 1);
                continue;
            }
        }
        if (["circle", "ellipse"].includes(elemType)) {
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
        }
        if (["circle", "ellipse", "line", "path"].includes(elemType)) {
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
        if (["circle", "g", "path"].includes(elemType)) {
            if (data.startsWith("class=\"")) {
                let classEnd = data.indexOf("\"", 7);
                if (classEnd == -1) {
                    throw unmatchedQuoteError;
                }
                peeked.setAttribute("class", data.substring(7, classEnd));
                data = data.substring(classEnd + 1);
                continue;
            }
        }
        if (["circle", "line", "path", "use"].includes(elemType) && data.startsWith("/>")) {
            writingProperties = false;
            data = data.substring(2);
            elementStack.pop();
            continue;
        }
        throw new Error(`During property reading of a ${elemType} element, found unknown token: ${data.substring(0, 20)}`);
    }
}


/**
 * Simplifies and tidies up the symbols loaded.
 * @param {SVGElement} targetElement
 * @param {UnpackAtomSymbolsOptions} options
 */
function unpackAtomSymbols(targetElement, options) {
    let error = "";
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

    for (let elem of targetElement.querySelectorAll(":scope .noStroke")) {
        elem.setAttribute("stroke", "none");
        elem.setAttribute("stroke-width", "0");
    }

    if (mode >= 1) {
        let useElem;
        while (useElem = targetElement.querySelector(":scope use")) {
            let reference = targetElement.querySelector(":scope " + useElem.getAttribute("href"));
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

        for (let i = targetElement.childElementCount - 1; i >= 0; i--) {
            let elem = targetElement.children[i];
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
    let outlineStyles;
    if (mode >= 2) {
        styles = Array.from(window.getComputedStyle(document.body));
        strokeStyles = styles.filter((s) => s.startsWith("--OMA-S-") && s != "--OMA-S-default-color").map((s) => s.substring(8));
        outlineStyles = styles.filter((s) => s.startsWith("--OMA-SO-") && s != "--OMA-SO-default-color").map((s) => s.substring(9));
        let disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        targetElement.append(disk);
        for (let atom of targetElement.children) {
            let id = atom.id.substring(6).replaceAll("_", "-");
            let baseColor = "var(--OMA-S-" + (strokeStyles.includes(id) ? id : "default-color") + ")";
            let outlineColor = "var(--OMA-SO-" + (outlineStyles.includes(id) ? id : "default-color") + ")";
            if (mode >= 3) {
                disk.style.fill = baseColor;
                baseColor = colorToHex(window.getComputedStyle(disk).fill);
                disk.style.fill = outlineColor;
                outlineColor = colorToHex(window.getComputedStyle(disk).fill);
            }
            for (let elem of atom.children) {
                if (["circle", "ellipse", "line", "path"].includes(elem.tagName)) {
                    if (elem.classList.contains(outlineClass)) {
                        elem.setAttribute("fill", "none");
                        elem.setAttribute("stroke", outlineColor);
                        elem.setAttribute("stroke-linecap", "square");
                    } else {
                        elem.setAttribute("fill", elem.classList.contains("fill") ? baseColor : "none");
                        elem.setAttribute("stroke", baseColor);
                    }
                }
            }
        }
        disk.remove();
    }
    for (let elem of targetElement.children) {
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