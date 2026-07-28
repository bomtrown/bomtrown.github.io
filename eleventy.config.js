module.exports = function(eleventyConfig) {
  // Tell Eleventy to copy the robots.txt file to the final build
  eleventyConfig.addPassthroughCopy("src/robots.xml"); 

  // Tell Eleventy to copy the favicons folder to the final build
  eleventyConfig.addPassthroughCopy("src/media/favicons");

  // Tell Eleventy to copy your media folder to the final build
  eleventyConfig.addPassthroughCopy("src/media");

  // Tell Eleventy to copy any JSON files inside your projects folder!
  eleventyConfig.addPassthroughCopy("src/projects/**/*.json");

  // Tell Eleventy to copy all image types from anywhere inside the projects folder
  eleventyConfig.addPassthroughCopy("src/projects/**/*.{jpg,jpeg,png,gif,svg,webp}");

  // Tell Eleventy where your working files are, and where to output the site
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};