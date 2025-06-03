module.exports = function (grunt) {
  grunt.initConfig({
    concat: {
      dist: {
        src: ["src/intro.js", "src/project.js", "src/outro.js"],
        dest: "build/scripts.js",
      },
    },
  });
  grunt.loadNpmTasks("grunt-contrib-concat");
};
