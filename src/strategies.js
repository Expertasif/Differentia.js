/**
* clone - Creates a deep clone of `subject`.
* @param  {(Object|Array)} subject               The Object/Array to clone.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {(Object|Array)}                     A clone of `subject`.
*/
strategies.clone = {
	interface: function (subject, search = null) {
		return runStrategy(strategies.clone, dfs, {
			subject: subject,
			search: search
		});
	},
	entry: function (state) {
		state.cloneRoot = createContainer(state.tuple.subject);
		state.tuple.clone = state.cloneRoot;
	},
	main: function (state) {
		if (state.isContainer) {
			if (state.currentValue instanceof RegExp) {
				// Clone a Regular Expression
				var flags = "";
				if (supportedRegExpProps.flags) {
					flags = state.currentValue.flags;
				} else {
					if (state.currentValue.global) flags += "g";
					if (state.currentValue.ignorecase) flags += "i";
					if (state.currentValue.multiline) flags += "m";
					if (supportedRegExpProps.sticky && state.currentValue.sticky) flags += "y";
					if (supportedRegExpProps.unicode && state.currentValue.unicode) flags += "u";
				}
				state.tuple.clone[state.accessor] = new RegExp(state.currentValue.source, flags);
			} else {
				if (state.existing !== null) {
					state.tuple.clone[state.accessor] = state.existing.clone;
				} else {
					state.tuple.clone[state.accessor] = createContainer(state.currentValue);
				}
			}
		} else if (isPrimitive(state.currentValue)) {
			// Clone a Primitive.
			state.tuple.clone[state.accessor] = state.currentValue;
		}
		if (state.isLast) {
			return state.cloneRoot;
		}
	}
};
/**
* diff - Determines if `compared`'s structure, properties, or values differ in any way from `subject`
* @param  {(Object|Array)} subject               The first Object/Array to compare.
* @param  {(Object|Array)} compare               The second Object/Array to compare.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {Boolean}                          Indicates if a difference was found.
*/
strategies.diff = {
	interface: function (subject, compare, search = null) {
		if (search === null && getContainerLength(subject) !== getContainerLength(compare)) {
			return true;
		}
		return runStrategy(strategies.diff, dfs, {
			subject: subject,
			compare: compare,
			search: search
		});
	},
	entry: function (state) {
		state.tuple.compare = state.parameters.compare;
	},
	main: function (state) {
		if (!("compare" in state.tuple) && !isContainer(state.tuple.compare) || !(state.accessor in state.tuple.compare)) {
			return true;
		}
		var subjectProp = state.currentValue;
		var compareProp = state.tuple.compare[state.accessor];
		if (((state.noIndex && state.isContainer) || isContainer(subjectProp)) && isContainer(compareProp)) {
			if (subjectProp instanceof RegExp && compareProp instanceof RegExp) {
				if (
					subjectProp.source !== compareProp.source
					|| subjectProp.ignoreCase !== compareProp.ignoreCase
					|| subjectProp.global !== compareProp.global
					|| subjectProp.multiline !== compareProp.multiline
					|| (supportedRegExpProps.sticky && subjectProp.sticky !== compareProp.sticky)
					|| (supportedRegExpProps.unicode && subjectProp.unicode !== compareProp.unicode)
					|| (supportedRegExpProps.flags && subjectProp.flags !== compareProp.flags)
				) {
					return true;
				}
			} else if (state.noIndex && getContainerLength(compareProp) !== getContainerLength(subjectProp)) {
				// Object index/property count does not match, they are different.
				return true;
			}
		} else if (subjectProp !== compareProp) {
			return true;
		}
		if (state.isLast) {
			return false;
		}
	}
};
/**
* diffClone - Clones the parts of `subject` that differ from `compared`'s structure, properties, or values.
* @param  {(Object|Array)} subject               The first Object/Array to compare and also clone.
* @param  {(Object|Array)} compare               The second Object/Array to compare.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {(Object|Array)}                     A clone of `subject`, only including differences.
*/
strategies.diffClone = {
	interface: function (subject, compare, search = null) {
		return runStrategy(strategies.diffClone, dfs, {
			subject: subject,
			compare: compare,
			search: search
		});
	},
	entry: function (state) {
		strategies.clone.entry(state);
		strategies.diff.entry(state);
	},
	main: function (state) {
		if (strategies.diff.main(state)) {
			return strategies.clone.main(state);
		}
	}
};
/**
* deepFreeze - Freezes all objects found in `subject`.
* @param  {(Object|Array)} subject               The Object/Array to deeply freeze.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {(Object|Array)}                     The original `subject`.
*/
strategies.deepFreeze = {
	interface: function (subject, search = null) {
		return runStrategy(strategies.deepFreeze, dfs, {
			subject: subject,
			search: search
		});
	},
	entry: function (state) {
		Object.freeze(state.subjectRoot);
	},
	main: function (state) {
		if (state.isContainer && state.existing === null) {
			Object.freeze(state.currentValue);
		}
		if (state.isLast) {
			return state.subjectRoot;
		}
	}
};
/**
* deepSeal - Seal all objects found in `subject`.
* @param  {(Object|Array)} subject               The Object/Array to deeply seal.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {(Object|Array)}                     The original `subject`.
*/
strategies.deepSeal = {
	interface: function (subject, search = null) {
		return runStrategy(strategies.deepSeal, dfs, {
			subject: subject,
			search: search
		});
	},
	entry: function (state) {
		Object.seal(state.subjectRoot);
	},
	main: function (state) {
		if (state.isContainer && state.existing === null) {
			Object.seal(state.currentValue);
		}
		if (state.isLast) {
			return state.subjectRoot;
		}
	}
};
/**
* forEach - A simple IOC wrapper to the `dfs` search iterator.
* @param  {(Object|Array)} subject               The Object/Array to traverse/enumerate.
* @param  {callback} callback                  The function to invoke per-property of all objects in `subject`.
	* @callback callback
	* @param {Mixed} value                 Equal to `subject[accessor]`.
	* @param {Mixed} accessor              Used to access `subject`.
	* @param {(Object|Array)} subject        The Object/Array being travered/enumerated.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {Mixed}                            Will return anything `callback` returns.
*/
strategies.forEach = {
	interface: function (subject, callback, search = null) {
		assert.function(callback, 2);
		return runStrategy(strategies.forEach, dfs, {
			subject: subject,
			search: search,
			callback: callback
		});
	},
	main: runCallback
};
/**
* find - Returns a value if it passes the test, otherwise returns `undefined`.
* @param  {(Object|Array)} subject               The Object/Array to traverse/enumerate.
* @param  {callback} callback                  Must return `true` if value passes the test.
	* @callback callback
	* @param {Mixed} value                 Equal to `subject[accessor]`.
	* @param {Mixed} accessor              Used to access `subject`.
	* @param {(Object|Array)} subject        The Object/Array being travered/enumerated.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {Boolean}                          A value that passes the test in `callback`.
*/
strategies.find = {
	interface: function (subject, callback, search = null) {
		assert.function(callback, 2);
		return runStrategy(strategies.find, dfs, {
			subject: subject,
			search: search,
			callback: callback
		});
	},
	main: function (state) {
		if (runCallback(state)) {
			return state.currentValue;
		}
	}
};
/**
* some - Returns `true` if at least one value passes the test, otherwise returns `false`.
* @param  {(Object|Array)} subject               The Object/Array to traverse/enumerate.
* @param  {callback} callback                  Must return `true` if value passes the test.
	* @callback callback
	* @param {Mixed} value                 Equal to `subject[accessor]`.
	* @param {Mixed} accessor              Used to access `subject`.
	* @param {(Object|Array)} subject        The Object/Array being travered/enumerated.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {Boolean}                          Indicates if at least one value passed the test.
*/
strategies.some = {
	interface: function (subject, callback, search = null) {
		assert.function(callback, 2);
		return runStrategy(strategies.some, dfs, {
			subject: subject,
			search: search,
			callback: callback
		});
	},
	main: function (state) {
		if (runCallback(state)) {
			return true;
		}
		if (state.isLast) {
			return false;
		}
	}
};
/**
* every - Returns `true` if all values passes the test, otherwise returns `false`.
* @param  {(Object|Array)} subject               The Object/Array to traverse/enumerate.
* @param  {callback} callback                  Must return `true` if value passes the test.
	* @callback callback
	* @param {Mixed} value                 Equal to `subject[accessor]`.
	* @param {Mixed} accessor              Used to access `subject`.
	* @param {(Object|Array)} subject        The Object/Array being travered/enumerated.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {Boolean}                          Indicates if all values passed the test.
*/
strategies.every = {
	interface: function (subject, callback, search = null) {
		assert.function(callback, 2);
		return runStrategy(strategies.every, dfs, {
			subject: subject,
			search: search,
			callback: callback
		});
	},
	main: function (state) {
		if (!runCallback(state)) {
			return false;
		}
		if (state.isLast) {
			return true;
		}
	}
};
/**
* map - Clones `subject`, using the return values of `callback`, which is executed once for each primitive element.
* @param  {(Object|Array)} subject               The Object/Array to traverse/enumerate.
* @param  {callback} callback                  The callback with which to process values.
	* @callback callback
	* @param {Mixed} value                 Equal to `subject[accessor]`.
	* @param {Mixed} accessor              Used to access `subject`.
	* @param {(Object|Array)} subject        The Object/Array being travered/enumerated.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {(Object|Array)}                     A clone of `subject`.
*/
strategies.map = {
	interface: function (subject, callback, search = null) {
		assert.function(callback, 2);
		return runStrategy(strategies.map, dfs, {
			subject: subject,
			search: search,
			callback: callback
		});
	},
	entry: strategies.clone.entry,
	main: function (state) {
		if (state.isContainer) {
			strategies.clone.main(state);
		} else {
			state.tuple.clone[state.accessor] = runCallback(state);
		}
		if (state.isLast) {
			return state.cloneRoot;
		}
	}
};
/**
* nodePaths - Creates a record of the tree paths present within `subject`, ignoring primitives.
* @param {(Object|Array)} subject               The Object/Array to record paths of.
* @param {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns {Array}                            An array containing arrays, each representing nodes in a path.
*/
strategies.nodePaths = {
	interface: function (subject, search = null) {
		return runStrategy(strategies.nodePaths, bfs, {
			subject: subject,
			search, search
		});
	},
	entry: function (state) {
		// Keeps track of node (object) paths only
		state.nodePaths = [];
		state.nonTraversedNodePaths = [];
		state.additions = 0;
		state.inRoot = true;
	},
	main: function (state) {
		if (state.iterations === 0) {
			if (!state.isFirst) {
				state.inRoot = false;
			}
			if (state.inRoot) {
				state.currentPath = [];
			} else {
				state.pathAccessor = (state.nodePaths.length - 1) - state.additions;
				state.currentPath = state.nodePaths[state.pathAccessor];
			}
			state.additions--;
		}
		if (state.traverse) {
			var newPath = Array.from(state.currentPath);
			newPath.push(state.accessor);
			state.nodePaths.push(newPath);
			state.additions++;
		} else if (state.isContainer && state.existing !== null) {
			var newPath = Array.from(state.currentPath);
			newPath.push(state.accessor);
			state.nonTraversedNodePaths.push(newPath);
		}
		if (state.isLast) {
			return state.nodePaths.concat(state.nonTraversedNodePaths);
		}
	}
};
/**
* paths - Creates a record of the tree paths present within `subject`, including primitives.
* @param {(Object|Array)} subject               The Object/Array to record paths of.
* @param {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns {Array}                            An array containing arrays, each representing nodes/primitives in a path.
*/
strategies.paths = {
	interface: function (subject, search = null) {
		return runStrategy(strategies.paths, bfs, {
			subject: subject,
			search, search
		});
	},
	entry: function (state) {
		strategies.nodePaths.entry(state);
		// Keeps track of all paths, including primitives
		state.paths = [];
	},
	main: function (state) {
		strategies.nodePaths.main(state);
		state.paths.push(Array.from(state.currentPath));
		state.paths[state.paths.length - 1].push(state.accessor);
		if (state.isLast) {
			return state.paths;
		}
	}
};
/**
* findPath - Creates a record of the first found tree path to `findValue` if found within `subject`, or returns `null`.
* @param {(Object|Array)} subject               The Object/Array to search for `findValue`.
* @param {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns {(Array|null)}                       An array containing arrays, each representing nodes in a path.
*/
strategies.findPath = {
	interface: function (subject, findValue, search = null) {
		return runStrategy(strategies.findPath, bfs, {
			subject: subject,
			search: search,
			findValue: findValue
		});
	},
	entry: strategies.paths.entry,
	main: function (state) {
		strategies.paths.main(state);
		if (state.currentValue === state.parameters.findValue) {
			return state.paths[state.paths.length > 1 ? state.paths.length - 1 : 0];
		}
		if (state.isLast) {
			return null;
		}
	}
};
/**
* findPaths - Creates a record of all of the tree paths to `findValue` if found within `subject`, or returns `null`.
* @param {(Object|Array)} subject               The Object/Array to search for `findValue`.
* @param {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns {(Array|null)}                       An array containing arrays, each representing nodes in a path.
*/
strategies.findPaths = {
	interface: function (subject, findValue, search = null) {
		return runStrategy(strategies.findPaths, bfs, {
			subject: subject,
			search: search,
			findValue: findValue
		});
	},
	entry: function (state) {
		strategies.paths.entry(state);
		state.foundPaths = [];
	},
	main: function (state) {
		strategies.paths.main(state);
		if (state.currentValue === state.parameters.findValue) {
			state.foundPaths.push(state.paths[state.paths.length > 0 ? state.paths.length - 1 : 0]);
		}
		if (state.isLast) {
			return state.foundPaths.length > 0 ? state.foundPaths : null;
		}
	}
};
/**
* findShortestPath - Creates a record of the shortest tree path to `findValue` if found within `subject`, or returns `null`.
* @param {(Object|Array)} subject               The Object/Array to search for `findValue`.
* @param {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns {(Array|null)}                       An array containing arrays, each representing nodes in a path.
*/
strategies.findShortestPath = {
	interface: function (subject, findValue, search = null) {
		return runStrategy(strategies.findShortestPath, bfs, {
			subject: subject,
			search: search,
			findValue: findValue
		});
	},
	entry: function (state) {
		strategies.paths.entry(state);
		state.depthLimit = Infinity;
		state.shortestDepth = Infinity;
		state.shortestPath = null;
	},
	main: function (state) {
		strategies.paths.main(state);
		if (state.isContainer && state.currentPath !== null && state.currentPath.length > state.depthLimit) {
			state.traverse = false;
		}
		if (state.currentValue === state.parameters.findValue) {
			state.depthLimit = state.currentPath.length;
			if (state.currentPath.length < state.shortestDepth) {
				state.shortestDepth = state.currentPath.length;
				state.shortestPath = state.paths[state.paths.length - 1];
			}
		}
		if (state.isLast) {
			return state.shortestPath;
		}
	}
};
/**
* diffPaths - Creates a record of tree paths in `subject` which differ from the tree paths of `compare`.
* @param  {(Object|Array)} subject               The first Object/Array to compare, and record paths from.
* @param  {(Object|Array)} compare               The second Object/Array to compare.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {Array}                            An array containing arrays, each representing nodes in a path.
*/
strategies.diffPaths = {
	interface: function (subject, compare, search = null) {
		return runStrategy(strategies.diffPaths, bfs, {
			subject: subject,
			compare: compare,
			search: search
		});
	},
	entry: function (state) {
		strategies.diff.entry(state);
		strategies.paths.entry(state);
		state.diffPaths = [];
	},
	main: function (state) {
		strategies.paths.main(state);
		if (strategies.diff.main(state)) {
			state.diffPaths.push(state.paths[state.paths.length - 1]);
		}
		if (state.isLast) {
			return state.diffPaths;
		}
	}
};
/**
* filter - Clones the parts of `subject` which pass the test.
* @param  {(Object|Array)} subject               The Object/Array to traverse/enumerate.
* @param  {callback} callback                  Must return `true` if value passes the test.
	* @callback callback
	* @param {Mixed} value                 Equal to `subject[accessor]`.
	* @param {Mixed} accessor              Used to access `subject`.
	* @param {(Object|Array)} subject        The Object/Array being travered/enumerated.
* @param  {(Object|Array|null)} [search = null]  An optional search index, acting as a traversal whitelist.
* @returns  {(Object|Array)}                     A clone of `subject`, only containing values which pass the test.
*/
strategies.filter = {
	interface: function (subject, callback, search = null) {
		assert.function(callback, 2);
		return runStrategy(strategies.filter, bfs, {
			subject: subject,
			search: search,
			callback: callback
		});
	},
	entry: function (state) {
		strategies.clone.entry(state);
		strategies.paths.entry(state);
		state.pendingPaths = [];
	},
	main: function (state) {
		strategies.paths.main(state);
		if (!state.isContainer && runCallback(state)) {
			if (state.isSecond) {
				state.pendingPaths.push([]);
			} else if (!state.isFirst) {
				state.pendingPaths.push(Array.from(state.currentPath));
			}
			state.pendingPaths[state.pendingPaths.length - 1].push(state.accessor);
		}
		if (state.isLast) {
			while (state.pendingPaths.length > 0) {
				var path = state.pendingPaths.shift();
				var nodeQueue = new structs.Queue();
				nodeQueue.push({
					subject: state.subjectRoot,
					clone: state.cloneRoot
				});
				while (path.length > 0 && nodeQueue.length > 0) {
					var accessor = path.shift();
					var tuple = nodeQueue.shift();
					if (!(accessor in tuple.clone)) {
						if (path.length === 0) {
							tuple.clone[accessor] = tuple.subject[accessor];
						} else {
							tuple.clone[accessor] = createContainer(tuple.subject[accessor]);
						}
					}
					if (path.length === 0) {
						continue;
					}
					var nextTuple = {};
					for (var unit in tuple) {
						nextTuple[unit] = tuple[unit][accessor];
					}
					nodeQueue.push(nextTuple);
				}
			}
			return state.cloneRoot;
		}
	}
};