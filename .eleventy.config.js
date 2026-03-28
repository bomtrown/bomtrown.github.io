module.exports = function(eleventyConfig) {
  // Tell Eleventy to copy your media folder to the final build
  eleventyConfig.addPassthroughCopy("src/media");

  // Tell Eleventy to copy any JSON files inside your projects folder!
  eleventyConfig.addPassthroughCopy("src/projects/**/*.json");

  // Tell Eleventy where your working files are, and where to output the site
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};