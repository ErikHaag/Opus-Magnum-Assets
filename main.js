import { loadAtomSymbols, unpackAtomSymbols } from "./symbols/atomSymbolsExpand.js"
import { loadAtomBases, unpackAtomBases } from "./bases/atomBasesExpand.js";
import { atomMerge } from "./combining/atomMerge.js";

document.addEventListener("DOMContentLoaded", async () => {
    let symbolsDestination = document.getElementById("symbols");
    let baseDestination = document.getElementById("bases");
    let atomDestination = document.getElementById("atoms");

    await loadAtomSymbols(symbolsDestination, { location: "./symbols/templates.svg" });
    unpackAtomSymbols(symbolsDestination, { allowOutlines: true, mode: 2 });

    await loadAtomBases(baseDestination, { location: "./bases/templates.svg" });
    unpackAtomBases(baseDestination, { mode: 0 });

    atomMerge(atomDestination, symbolsDestination, baseDestination, { mode: 1 });

    let grid = document.getElementById("grid");
    let i = 0n;
    let j = 0n;
    let filter = [];
    let counter = 0n;
    for (let elem of atomDestination.children) {
        if (filter.length) {
            let s = false;
            for (let f of filter) {
                if (elem.id.includes(f)) {
                    s = true;
                    break;
                }
            }
            if (!s) {
                continue;
            }
        }
        let T = `translate(${70n * i}, ${70n * j})`;
        let useElem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        grid.appendChild(useElem);
        useElem.setAttribute("href", `#${elem.id}`);
        useElem.setAttribute("transform", T);
        i += 1n;
        if (i >= 10n) {
            i = 0n;
            j++;
        }
        counter++;
    }
    symbolsDestination.parentElement.setAttribute("width", 70n * (j == 0n ? i + 1n : 10n));
    symbolsDestination.parentElement.setAttribute("height", 70n * (j + 1n));
    console.log(`Found ${counter} atoms.`);
});