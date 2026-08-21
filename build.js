/*
This script merges spotelly.js, timetable.html and config.html into one single file and writes
the output to ./final/dist.js.

Steps performed:

- To conserve memory on the Shelly, compress the html files and replace the html placeholders
  in spotelly.js with the BASE64-encoded compressed output
- To reduce the physical script size, remove all comments and empty lines from spotelly.js

This script must be executed after each change to one of the files in the src directory and can
be started with 'npm run build'.
*/

import { transformSync } from "@babel/core";
import { gzipAsync } from "@gfx/zopfli";
import { minify } from "html-minifier-terser";
import fs from "node:fs";

async function compress(htmlfile) {
  console.log(`Processing ${htmlfile}:`);

  const html = fs.readFileSync(htmlfile, "utf8");
  console.log("HTML:", html.length, "bytes");

  const minified = await minify(html, {
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

async function main(sourceJS, targetJS) {
  let source = fs.readFileSync(sourceJS, "utf8");

  // replace html placeholders in spotelly.js with the compressed versions
  for (const match of source.matchAll(/({{ (.*\.html) }})/g)) {
    source = source.replace(match[1], await compress(`./src/${match[2]}`));
  }

  // remove comments from source to reduce physical script size
  source = transformSync(source, { comments: false }).code;

  // write modified source to dist folder
  fs.writeFileSync(targetJS, source);
  console.log("Modified JS has been written to", targetJS);
}

main("./src/spotelly.js", "./dist/final.js");
