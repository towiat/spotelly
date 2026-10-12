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

async function main(sourceJS, targetJS) {
  let source = fs.readFileSync(sourceJS, "utf8");

  // replace html placeholders in spotelly.js with the compressed versions
  for (const match of source.matchAll(/({{ (.*\.html) }})/g)) {
    source = source.replace(match[1], await compress(`./src/${match[2]}`));
  }

  // minify the main script source
  source = await minifyJS(source, { mangle: { toplevel: true } });

  // send the source through babel to add logical line breaks for better error reporting
  source = transformSync(source.code).code;

  // write modified source to dist folder
  fs.writeFileSync(targetJS, source);
  console.log("Modified JS has been written to", targetJS);
}

try {
  await main("./src/spotelly.js", "./dist/final.js");
} catch (error) {
  console.error(error);
  process.exit(1);
}
