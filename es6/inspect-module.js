const { merge, cloneDeep } = require("lodash");

function isPlaceholder(part) {
	return part.type === "placeholder";
}

function getTags(postParsed) {
	return postParsed.filter(isPlaceholder).reduce(function(tags, part) {
		tags[part.value] = tags[part.value] || {};
		if (part.subparsed) {
			tags[part.value] = merge(tags[part.value], getTags(part.subparsed));
		}
		return tags;
	}, {});
}

function getStructuredTags(postParsed) {
	return postParsed.filter(isPlaceholder).map(function(part) {
		if (part.subparsed) {
			part.subparsed = getStructuredTags(part.subparsed);
		}
		return part;
	}, {});
}

class InspectModule {
	constructor() {
		this.inspect = {};
		this.fullInspected = {};
		this.filePath = null;
		this.nullValues = [];
	}
	optionsTransformer(options, docxtemplater) {
		this.fileTypeConfig = docxtemplater.fileTypeConfig;
		this.zip = docxtemplater.zip;
		this.inspect.templatedFiles = docxtemplater.getTemplatedFiles();
		this.inspect.fileType = docxtemplater.fileType;
		return options;
	}
	set(obj) {
		if (obj.data) {
			this.inspect = merge({}, this.inspect, { tags: obj.data });
		}
		if (obj.inspect) {
			if (obj.inspect.filePath) {
				this.filePath = obj.inspect.filePath;
			}
			this.inspect = merge({}, this.inspect, obj.inspect);
			this.fullInspected[this.filePath] = this.inspect;
		}
	}
	nullGetter(part, scopeManager, xt) {
		const inspected = this.fullInspected[xt.filePath];
		inspected.nullValues = inspected.nullValues || { summary: [], detail: [] };
		inspected.nullValues.detail.push({ part, scopeManager });
		inspected.nullValues.summary.push(
			scopeManager.scopePath.concat(part.value)
		);
	}
	getTags(file) {
		file = file || this.fileTypeConfig.textPath(this.zip);
		return getTags(cloneDeep(this.fullInspected[file].postparsed));
	}
	getAllTags() {
		return Object.keys(this.fullInspected).reduce((result, file) => {
			return merge(result, this.getTags(file));
		}, {});
	}
	getStructuredTags(file) {
		file = file || this.fileTypeConfig.textPath(this.zip);
		return getStructuredTags(cloneDeep(this.fullInspected[file].postparsed));
	}
	getAllStructuredTags() {
		return Object.keys(this.fullInspected).reduce((result, file) => {
			return result.concat(this.getStructuredTags(file));
		}, []);
	}
}

module.exports = () => new InspectModule();