export { atomMerge };

/**
 * Merges the symbols and bases of each element into a single collection
 * @param {Element} destinationElement 
 * @param {Element} symbolsElement 
 * @param {Element} basesElement 
 * @param {Object} options 
 */
function atomMerge(destinationElement, symbolsElement, basesElement, options = {}) {
    let error = "";
    if (!(destinationElement instanceof Element)) {
        error += "Destination must be an element.\n";
    }

    if (!(symbolsElement instanceof Element)) {
        error += "Symbols must be an element.\n";
    }

    if (!(basesElement instanceof Element)) {
        error += "Bases must be an element.\n";
    }

    let mode = options.mode ?? 0;
    if (typeof (mode) != "number") {
        error += "Mode must be a number or nullish.\n";
    }

    let symbolClass = options.symbolClass ?? "OMA-S";
    if (typeof (symbolClass) != "string") {
        error += "symbolClass must be a string or nullish.";
    }

    let lowMode = options.lowMode ?? false;
    if (typeof (lowMode) != "boolean") {
        error += "lowMode must be a boolean or nullish.";
    }

    if (error.length != 0) {
        throw new Error(e);
    }

    let symbols = Array.from(symbolsElement.children).map((e) => e.id).filter((i) => i.startsWith("OMA_S_")).map((s) => s.substring(6)).sort();
    let bases = Array.from(basesElement.children).map((e) => e.id).filter((i) => i.startsWith("OMA_B_")).map((s) => s.substring(6)).sort();

    const normalTransform = "translate(3, 3) scale(0.9)";
    const nudgeDownTransform = "translate(3, 6.75) scale(0.9)";
    const nudgeUpTransform = "translate(3, -0.75) scale(0.9)";


    while (symbols.length != 0 && bases.length != 0) {
        if (symbols[0] > bases[0]) {
            bases.shift();
            continue;
        }
        if (symbols[0] < bases[0]) {
            symbols.shift();
            continue;
        }

        let name = symbols.shift();
        let atom = document.createElementNS("http://www.w3.org/2000/svg", "g");
        destinationElement.appendChild(atom);
        atom.id = `OMA_A_${name}`;
        if (mode >= 1) {
            let baseSrc = basesElement.querySelector(`:scope #OMA_B_${name}`);
            for (let c of baseSrc.children) {
                atom.appendChild(c.cloneNode());
            }
            let symbolSrc = symbolsElement.querySelector(`:scope #OMA_S_${name}`);
            let symbolG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            atom.appendChild(symbolG);
            for (let c of symbolSrc.children) {
                symbolG.appendChild(c.cloneNode());
            }
            if (symbolSrc.classList.contains("nudge-down")) {
                symbolG.setAttribute("transform", nudgeDownTransform);
            } else if (symbolSrc.classList.contains("nudge-up")) {
                symbolG.setAttribute("transform", nudgeUpTransform);
            } else {
                symbolG.setAttribute("transform", normalTransform);
            }

            if (lowMode && symbolSrc.classList.contains(symbolClass)) {
                symbolG.classList.add(symbolClass);
            }
        } else {
            let use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            atom.appendChild(use);
            use.setAttribute("href", `#OMA_B_${name}`);
            use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            atom.appendChild(use);
            let useUrl = `#OMA_S_${name}`
            let useSrc = symbolsElement.querySelector(`:scope ${useUrl}`);
            use.setAttribute("href", useUrl);
            if (useSrc.classList.contains("nudge-down")) {
                use.setAttribute("transform", nudgeDownTransform);
            } else if (useSrc.classList.contains("nudge-up")) {
                use.setAttribute("transform", nudgeUpTransform);
            } else {
                use.setAttribute("transform", normalTransform);
            }
        }

        bases.shift();
    }
}