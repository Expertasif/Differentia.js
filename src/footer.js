// Modules to Reveal
var publicModules = {
	structs: structs,
	dfs: dfs,
	bfs: bfs,
	getContainerLength: getContainerLength,
	isContainer: isContainer,
};
// Automatically Reveal Strategy Interfaces
for (var name in strategies) {
	publicModules[name] = strategies[name].interface;
}
return publicModules;
})();
// NodeJS `require` compatibility
if (typeof module !== "undefined") {
	module.exports = differentia;
}