/*
This script merges spotelly.js, timetable.html and config.html into one single file and writes
the output to ./final/dist.js.

Steps performed:

- To conserve memory on the Shelly, compress the html files and replace the html placeholders
  in spotelly.js with the BASE64-encoded compressed output
- Minify the spotelly.js script code for reduced physical size and memory usage and slightly
  better performance

This script must be executed after each change to one of the files in the src directory and can
be started with 'npm run build'.
*/

import { transformSync } from "@babel/core";
import { gzipAsync } from "@gfx/zopfli";
import { minify as minifyHTML } from "html-minifier-terser";
import fs from "node:fs";
import { minify as minifyJS } from "terser";

async function compress(htmlfile) {
  console.log(`Processing ${htmlfile}:`);

  const html = fs.readFileSync(htmlfile, "utf8");
  console.log("HTML:", html.length, "bytes");

  const minified = await minifyHTML(html, {
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: {
      ecma: 2015,
      toplevel: true,
    },
    removeAttributeQuotes: true,
    removeComments: true,
    removeOptionalTags: true,
    sortAttributes: true,
    sortClassName: true,
  });
  console.log(minified);
  console.log("Minified:", minified.length, "bytes");

  const compressed = await gzipAsync(minified, {
    numiterations: 20,
    blocksplitting: true,
    blocksplittingmax: 15,
  });
  console.log("Compressed:", compressed.length, "bytes");

  const encoded = Buffer.from(compressed).toString("base64");
  console.log("Encoded:", encoded.length, "bytes", "\n");

  return encoded;
}

// name generator with a fixed sequence (a…_, aa, ba…_9, aaa…) for terser's mangler
const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789";
const nthIdentifier = {
  get(n) {
    let name = "";
    // first character must not be a digit
    for (let base = 53; ; base = 63) {
      name += chars[n % base];
      n = Math.floor(n / base) - 1;
      if (n < 0) return name;
    }
  },
};

async function main(sourceJS, targetJS) {
  const source = fs.readFileSync(sourceJS, "utf8");

  // minify the main script
  let { code } = await minifyJS(source, {
    mangle: { toplevel: true, nth_identifier: nthIdentifier },
  });

  // replace html placeholders with the compressed versions
  for (const [placeholder, file] of code.matchAll(/{{ (.*?\.html) }}/g)) {
    code = code.replace(placeholder, await compress(`./src/${file}`));
  }

  // send the source through babel to add logical line breaks for better error reporting
  code = transformSync(code).code;

  // write modified source to dist folder
  fs.writeFileSync(targetJS, code);
  console.log("Modified JS has been written to", targetJS);
}

try {
  await main("./src/spotelly.js", "./dist/final.js");
} catch (error) {
  console.error(error);
  process.exit(1);
}
