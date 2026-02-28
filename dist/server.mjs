#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import os from "os";
import path from "path";

//#region package.json
var name = "@compasify/redmine-mcp-server";
var version = "1.0.0";
var description = "MCP server for Redmine";
var type = "module";
var packageManager = "pnpm@10.20.0";
var bin = { "redmine-mcp-server": "./dist/server.mjs" };
var files = ["dist/**/*"];
var publishConfig = { "access": "public" };
var scripts = {
	"gen": "rm -rf src/__generated__ && orval && node post-generate.js",
	"build": "pnpm gen && tsdown"
};
var repository = {
	"type": "git",
	"url": "git+https://github.com/compasify/redmine-mcp-server.git"
};
var keywords = [
	"mcp",
	"modelcontextprotocol",
	"redmine"
];
var author = "compasify";
var license = "MIT";
var bugs = { "url": "https://github.com/compasify/redmine-mcp-server/issues" };
var homepage = "https://github.com/compasify/redmine-mcp-server#readme";
var devDependencies = {
	"@types/node": "^20.0.0",
	"orval": "^7.10.0",
	"tsdown": "^0.12.9",
	"typescript": "^5.8.3"
};
var dependencies = {
	"@modelcontextprotocol/sdk": "1.15.0",
	"zod": "^3.25.75"
};
var package_default = {
	name,
	version,
	description,
	type,
	packageManager,
	bin,
	files,
	publishConfig,
	scripts,
	repository,
	keywords,
	author,
	license,
	bugs,
	homepage,
	devDependencies,
	dependencies
};

//#endregion
//#region src/config.ts
/**
* Load feature flags from environment variables
* Default: All features enabled unless explicitly disabled
*/
const loadFeatureFlags = () => {
	return {
		relations: process.env.REDMINE_MCP_DISABLE_RELATIONS !== "true",
		timeEntries: process.env.REDMINE_MCP_DISABLE_TIME_ENTRIES !== "true",
		versions: process.env.REDMINE_MCP_DISABLE_VERSIONS !== "true",
		watchers: process.env.REDMINE_MCP_DISABLE_WATCHERS !== "true",
		wiki: process.env.REDMINE_MCP_DISABLE_WIKI !== "true",
		news: process.env.REDMINE_MCP_DISABLE_NEWS !== "true",
		users: process.env.REDMINE_MCP_DISABLE_USERS !== "true",
		groups: process.env.REDMINE_MCP_DISABLE_GROUPS !== "true",
		memberships: process.env.REDMINE_MCP_DISABLE_MEMBERSHIPS !== "true",
		attachments: process.env.REDMINE_MCP_DISABLE_ATTACHMENTS !== "true",
		files: process.env.REDMINE_MCP_DISABLE_FILES !== "true",
		projects: process.env.REDMINE_MCP_DISABLE_PROJECTS !== "true"
	};
};
/**
* Load configuration from environment variables
*/
const loadConfig = () => {
	const readOnlyMode = process.env.REDMINE_MCP_READ_ONLY === "true";
	const redmineUrl = process.env.REDMINE_URL;
	if (!redmineUrl) throw new Error("REDMINE_URL environment variable is not set");
	const redmineApiKey = process.env.REDMINE_API_KEY;
	if (!redmineApiKey) throw new Error("REDMINE_API_KEY environment variable is not set");
	return {
		readOnlyMode,
		redmineUrl,
		redmineApiKey,
		features: loadFeatureFlags()
	};
};
/**
* Get current configuration
*/
const config = loadConfig();

//#endregion
//#region src/api/custom-fetch.ts
const customFetch = async (url, options) => {
	const headers = {
		"X-Redmine-API-Key": config.redmineApiKey,
		...options?.headers
	};
	const normalizedBase = config.redmineUrl.replace(/\/$/, "");
	const normalizedPath = url.startsWith("/") ? url : "/" + url;
	const fullUrl = normalizedBase + normalizedPath;
	console.error(`Fetching URL: ${fullUrl}`);
	const res = await fetch(fullUrl, {
		...options,
		headers
	});
	console.error(`Response status: ${res.status}`);
	if (!res.ok) {
		const contentType = res.headers.get("content-type");
		if (contentType?.includes("text/html")) {
			const text = await res.text();
			throw new Error(`Expected JSON but received HTML (HTTP ${res.status}). URL: ${fullUrl}. Response body: ${text.substring(0, 200)}...`);
		}
	}
	return res;
};

//#endregion
//#region src/__generated__/http-client.ts
const getGetIssuesUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/issues.${format}?${stringifiedParams}` : `/issues.${format}`;
};
const getIssues = async (format, params, options) => {
	const res = await customFetch(getGetIssuesUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateIssueUrl = (format) => {
	return `/issues.${format}`;
};
const createIssue = async (format, createIssueBody$1, options) => {
	const res = await customFetch(getCreateIssueUrl(format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createIssueBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetIssueUrl = (issueId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/issues/${issueId}.${format}?${stringifiedParams}` : `/issues/${issueId}.${format}`;
};
const getIssue = async (issueId, format, params, options) => {
	const res = await customFetch(getGetIssueUrl(issueId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateIssueUrl = (issueId, format) => {
	return `/issues/${issueId}.${format}`;
};
const updateIssue = async (issueId, format, updateIssueBody$1, options) => {
	const res = await customFetch(getUpdateIssueUrl(issueId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateIssueBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteIssueUrl = (issueId, format) => {
	return `/issues/${issueId}.${format}`;
};
const deleteIssue = async (issueId, format, options) => {
	const res = await customFetch(getDeleteIssueUrl(issueId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getAddWatcherUrl = (issueId, format) => {
	return `/issues/${issueId}/watchers.${format}`;
};
const addWatcher = async (issueId, format, addWatcherBody$1, options) => {
	const res = await customFetch(getAddWatcherUrl(issueId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(addWatcherBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getRemoveWatcherUrl = (issueId, userId, format) => {
	return `/issues/${issueId}/watchers/${userId}.${format}`;
};
const removeWatcher = async (issueId, userId, format, options) => {
	const res = await customFetch(getRemoveWatcherUrl(issueId, userId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetProjectsUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects.${format}?${stringifiedParams}` : `/projects.${format}`;
};
const getProjects = async (format, params, options) => {
	const res = await customFetch(getGetProjectsUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateProjectUrl = (format) => {
	return `/projects.${format}`;
};
const createProject = async (format, createProjectBody$1, options) => {
	const res = await customFetch(getCreateProjectUrl(format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createProjectBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetProjectUrl = (projectId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}.${format}?${stringifiedParams}` : `/projects/${projectId}.${format}`;
};
const getProject = async (projectId, format, params, options) => {
	const res = await customFetch(getGetProjectUrl(projectId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateProjectUrl = (projectId, format) => {
	return `/projects/${projectId}.${format}`;
};
const updateProject = async (projectId, format, updateProjectBody$1, options) => {
	const res = await customFetch(getUpdateProjectUrl(projectId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateProjectBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteProjectUrl = (projectId, format) => {
	return `/projects/${projectId}.${format}`;
};
const deleteProject = async (projectId, format, options) => {
	const res = await customFetch(getDeleteProjectUrl(projectId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getArchiveProjectUrl = (projectId, format) => {
	return `/projects/${projectId}/archive.${format}`;
};
const archiveProject = async (projectId, format, options) => {
	const res = await customFetch(getArchiveProjectUrl(projectId, format), {
		...options,
		method: "PUT"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUnarchiveProjectUrl = (projectId, format) => {
	return `/projects/${projectId}/unarchive.${format}`;
};
const unarchiveProject = async (projectId, format, options) => {
	const res = await customFetch(getUnarchiveProjectUrl(projectId, format), {
		...options,
		method: "PUT"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetMembershipsUrl = (projectId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}/memberships.${format}?${stringifiedParams}` : `/projects/${projectId}/memberships.${format}`;
};
const getMemberships = async (projectId, format, params, options) => {
	const res = await customFetch(getGetMembershipsUrl(projectId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateMembershipUrl = (projectId, format) => {
	return `/projects/${projectId}/memberships.${format}`;
};
const createMembership = async (projectId, format, createMembershipBody$1, options) => {
	const res = await customFetch(getCreateMembershipUrl(projectId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createMembershipBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetMembershipUrl = (membershipId, format) => {
	return `/memberships/${membershipId}.${format}`;
};
const getMembership = async (membershipId, format, options) => {
	const res = await customFetch(getGetMembershipUrl(membershipId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateMembershipUrl = (membershipId, format) => {
	return `/memberships/${membershipId}.${format}`;
};
const updateMembership = async (membershipId, format, updateMembershipBody$1, options) => {
	const res = await customFetch(getUpdateMembershipUrl(membershipId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateMembershipBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteMembershipUrl = (membershipId, format) => {
	return `/memberships/${membershipId}.${format}`;
};
const deleteMembership = async (membershipId, format, options) => {
	const res = await customFetch(getDeleteMembershipUrl(membershipId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCloseProjectUrl = (projectId, format) => {
	return `/projects/${projectId}/close.${format}`;
};
const closeProject = async (projectId, format, options) => {
	const res = await customFetch(getCloseProjectUrl(projectId, format), {
		...options,
		method: "PUT"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getReopenProjectUrl = (projectId, format) => {
	return `/projects/${projectId}/reopen.${format}`;
};
const reopenProject = async (projectId, format, options) => {
	const res = await customFetch(getReopenProjectUrl(projectId, format), {
		...options,
		method: "PUT"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetUsersUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/users.${format}?${stringifiedParams}` : `/users.${format}`;
};
const getUsers = async (format, params, options) => {
	const res = await customFetch(getGetUsersUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateUserUrl = (format) => {
	return `/users.${format}`;
};
const createUser = async (format, createUserBody$1, options) => {
	const res = await customFetch(getCreateUserUrl(format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createUserBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetUserUrl = (userId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/users/${userId}.${format}?${stringifiedParams}` : `/users/${userId}.${format}`;
};
const getUser = async (userId, format, params, options) => {
	const res = await customFetch(getGetUserUrl(userId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateUserUrl = (userId, format) => {
	return `/users/${userId}.${format}`;
};
const updateUser = async (userId, format, updateUserBody$1, options) => {
	const res = await customFetch(getUpdateUserUrl(userId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateUserBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteUserUrl = (userId, format) => {
	return `/users/${userId}.${format}`;
};
const deleteUser = async (userId, format, options) => {
	const res = await customFetch(getDeleteUserUrl(userId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetCurrentUserUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/users/current.${format}?${stringifiedParams}` : `/users/current.${format}`;
};
const getCurrentUser = async (format, params, options) => {
	const res = await customFetch(getGetCurrentUserUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetTimeEntriesUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/time_entries.${format}?${stringifiedParams}` : `/time_entries.${format}`;
};
const getTimeEntries = async (format, params, options) => {
	const res = await customFetch(getGetTimeEntriesUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateTimeEntryUrl = (format) => {
	return `/time_entries.${format}`;
};
const createTimeEntry = async (format, createTimeEntryBody$1, options) => {
	const res = await customFetch(getCreateTimeEntryUrl(format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createTimeEntryBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetTimeEntryUrl = (timeEntryId, format) => {
	return `/time_entries/${timeEntryId}.${format}`;
};
const getTimeEntry = async (timeEntryId, format, options) => {
	const res = await customFetch(getGetTimeEntryUrl(timeEntryId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateTimeEntryUrl = (timeEntryId, format) => {
	return `/time_entries/${timeEntryId}.${format}`;
};
const updateTimeEntry = async (timeEntryId, format, updateTimeEntryBody$1, options) => {
	const res = await customFetch(getUpdateTimeEntryUrl(timeEntryId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateTimeEntryBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteTimeEntryUrl = (timeEntryId, format) => {
	return `/time_entries/${timeEntryId}.${format}`;
};
const deleteTimeEntry = async (timeEntryId, format, options) => {
	const res = await customFetch(getDeleteTimeEntryUrl(timeEntryId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetNewsListUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/news.${format}?${stringifiedParams}` : `/news.${format}`;
};
const getNewsList = async (format, params, options) => {
	const res = await customFetch(getGetNewsListUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetNewsUrl = (newsId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/news/${newsId}.${format}?${stringifiedParams}` : `/news/${newsId}.${format}`;
};
const getNews = async (newsId, format, params, options) => {
	const res = await customFetch(getGetNewsUrl(newsId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateNewsUrl = (newsId, format) => {
	return `/news/${newsId}.${format}`;
};
const updateNews = async (newsId, format, updateNewsBody$1, options) => {
	const res = await customFetch(getUpdateNewsUrl(newsId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateNewsBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteNewsUrl = (newsId, format) => {
	return `/news/${newsId}.${format}`;
};
const deleteNews = async (newsId, format, options) => {
	const res = await customFetch(getDeleteNewsUrl(newsId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetNewsListByProjectUrl = (projectId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}/news.${format}?${stringifiedParams}` : `/projects/${projectId}/news.${format}`;
};
const getNewsListByProject = async (projectId, format, params, options) => {
	const res = await customFetch(getGetNewsListByProjectUrl(projectId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateNewsUrl = (projectId, format) => {
	return `/projects/${projectId}/news.${format}`;
};
const createNews = async (projectId, format, createNewsBody$1, options) => {
	const res = await customFetch(getCreateNewsUrl(projectId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createNewsBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetIssueRelationsUrl = (issueId, format) => {
	return `/issues/${issueId}/relations.${format}`;
};
const getIssueRelations = async (issueId, format, options) => {
	const res = await customFetch(getGetIssueRelationsUrl(issueId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateIssueRelationUrl = (issueId, format) => {
	return `/issues/${issueId}/relations.${format}`;
};
const createIssueRelation = async (issueId, format, createIssueRelationBody$1, options) => {
	const res = await customFetch(getCreateIssueRelationUrl(issueId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createIssueRelationBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetIssueRelationUrl = (issueRelationId, format) => {
	return `/relations/${issueRelationId}.${format}`;
};
const getIssueRelation = async (issueRelationId, format, options) => {
	const res = await customFetch(getGetIssueRelationUrl(issueRelationId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteIssueRelationUrl = (issueRelationId, format) => {
	return `/relations/${issueRelationId}.${format}`;
};
const deleteIssueRelation = async (issueRelationId, format, options) => {
	const res = await customFetch(getDeleteIssueRelationUrl(issueRelationId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetVersionsByProjectUrl = (projectId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}/versions.${format}?${stringifiedParams}` : `/projects/${projectId}/versions.${format}`;
};
const getVersionsByProject = async (projectId, format, params, options) => {
	const res = await customFetch(getGetVersionsByProjectUrl(projectId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateVersionUrl = (projectId, format) => {
	return `/projects/${projectId}/versions.${format}`;
};
const createVersion = async (projectId, format, createVersionBody$1, options) => {
	const res = await customFetch(getCreateVersionUrl(projectId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createVersionBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetVersionsUrl = (versionId, format) => {
	return `/versions/${versionId}.${format}`;
};
const getVersions = async (versionId, format, options) => {
	const res = await customFetch(getGetVersionsUrl(versionId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateVersionUrl = (versionId, format) => {
	return `/versions/${versionId}.${format}`;
};
const updateVersion = async (versionId, format, updateVersionBody$1, options) => {
	const res = await customFetch(getUpdateVersionUrl(versionId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateVersionBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteVersionUrl = (versionId, format) => {
	return `/versions/${versionId}.${format}`;
};
const deleteVersion = async (versionId, format, options) => {
	const res = await customFetch(getDeleteVersionUrl(versionId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetWikiPagesUrl = (projectId, format) => {
	return `/projects/${projectId}/wiki/index.${format}`;
};
const getWikiPages = async (projectId, format, options) => {
	const res = await customFetch(getGetWikiPagesUrl(projectId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetWikiPageUrl = (projectId, wikiPageTitle, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}/wiki/${wikiPageTitle}.${format}?${stringifiedParams}` : `/projects/${projectId}/wiki/${wikiPageTitle}.${format}`;
};
const getWikiPage = async (projectId, wikiPageTitle, format, params, options) => {
	const res = await customFetch(getGetWikiPageUrl(projectId, wikiPageTitle, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateWikiPageUrl = (projectId, wikiPageTitle, format) => {
	return `/projects/${projectId}/wiki/${wikiPageTitle}.${format}`;
};
const updateWikiPage = async (projectId, wikiPageTitle, format, updateWikiPageBody$1, options) => {
	const res = await customFetch(getUpdateWikiPageUrl(projectId, wikiPageTitle, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateWikiPageBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteWikiPageUrl = (projectId, wikiPageTitle, format) => {
	return `/projects/${projectId}/wiki/${wikiPageTitle}.${format}`;
};
const deleteWikiPage = async (projectId, wikiPageTitle, format, options) => {
	const res = await customFetch(getDeleteWikiPageUrl(projectId, wikiPageTitle, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetWikiPageByVersionUrl = (projectId, wikiPageTitle, versionId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}/wiki/${wikiPageTitle}/${versionId}.${format}?${stringifiedParams}` : `/projects/${projectId}/wiki/${wikiPageTitle}/${versionId}.${format}`;
};
const getWikiPageByVersion = async (projectId, wikiPageTitle, versionId, format, params, options) => {
	const res = await customFetch(getGetWikiPageByVersionUrl(projectId, wikiPageTitle, versionId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetQueriesUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/queries.${format}?${stringifiedParams}` : `/queries.${format}`;
};
const getQueries = async (format, params, options) => {
	const res = await customFetch(getGetQueriesUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetAttachmentUrl = (attachmentId, format) => {
	return `/attachments/${attachmentId}.${format}`;
};
const getAttachment = async (attachmentId, format, options) => {
	const res = await customFetch(getGetAttachmentUrl(attachmentId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateAttachmentUrl = (attachmentId, format) => {
	return `/attachments/${attachmentId}.${format}`;
};
const updateAttachment = async (attachmentId, format, updateAttachmentBody$1, options) => {
	const res = await customFetch(getUpdateAttachmentUrl(attachmentId, format), {
		...options,
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateAttachmentBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteAttachmentUrl = (attachmentId, format) => {
	return `/attachments/${attachmentId}.${format}`;
};
const deleteAttachment = async (attachmentId, format, options) => {
	const res = await customFetch(getDeleteAttachmentUrl(attachmentId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDownloadAttachmentFileUrl = (attachmentId, filename) => {
	return `/attachments/download/${attachmentId}/${filename}`;
};
const getDownloadThumbnailUrl = (attachmentId) => {
	return `/attachments/thumbnail/${attachmentId}`;
};
const getGetIssueStatusesUrl = (format) => {
	return `/issue_statuses.${format}`;
};
const getIssueStatuses = async (format, options) => {
	const res = await customFetch(getGetIssueStatusesUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetTrackersUrl = (format) => {
	return `/trackers.${format}`;
};
const getTrackers = async (format, options) => {
	const res = await customFetch(getGetTrackersUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetIssueCategoriesUrl = (projectId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/projects/${projectId}/issue_categories.${format}?${stringifiedParams}` : `/projects/${projectId}/issue_categories.${format}`;
};
const getIssueCategories = async (projectId, format, params, options) => {
	const res = await customFetch(getGetIssueCategoriesUrl(projectId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateIssueCategoryUrl = (projectId, format) => {
	return `/projects/${projectId}/issue_categories.${format}`;
};
const createIssueCategory = async (projectId, format, createIssueCategoryBody$1, options) => {
	const res = await customFetch(getCreateIssueCategoryUrl(projectId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createIssueCategoryBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetIssuePrioritiesUrl = (format) => {
	return `/enumerations/issue_priorities.${format}`;
};
const getIssuePriorities = async (format, options) => {
	const res = await customFetch(getGetIssuePrioritiesUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetTimeEntryActivitiesUrl = (format) => {
	return `/enumerations/time_entry_activities.${format}`;
};
const getTimeEntryActivities = async (format, options) => {
	const res = await customFetch(getGetTimeEntryActivitiesUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetDocumentCategoriesUrl = (format) => {
	return `/enumerations/document_categories.${format}`;
};
const getDocumentCategories = async (format, options) => {
	const res = await customFetch(getGetDocumentCategoriesUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetIssueCategoryUrl = (issueCategoryId, format) => {
	return `/issue_categories/${issueCategoryId}.${format}`;
};
const getIssueCategory = async (issueCategoryId, format, options) => {
	const res = await customFetch(getGetIssueCategoryUrl(issueCategoryId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateIssueCategoryUrl = (issueCategoryId, format) => {
	return `/issue_categories/${issueCategoryId}.${format}`;
};
const updateIssueCategory = async (issueCategoryId, format, updateIssueCategoryBody$1, options) => {
	const res = await customFetch(getUpdateIssueCategoryUrl(issueCategoryId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateIssueCategoryBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteIssueCategoryUrl = (issueCategoryId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/issue_categories/${issueCategoryId}.${format}?${stringifiedParams}` : `/issue_categories/${issueCategoryId}.${format}`;
};
const deleteIssueCategory = async (issueCategoryId, format, params, options) => {
	const res = await customFetch(getDeleteIssueCategoryUrl(issueCategoryId, format, params), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetRolesUrl = (format) => {
	return `/roles.${format}`;
};
const getRoles = async (format, options) => {
	const res = await customFetch(getGetRolesUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetRoleUrl = (roleId, format) => {
	return `/roles/${roleId}.${format}`;
};
const getRole = async (roleId, format, options) => {
	const res = await customFetch(getGetRoleUrl(roleId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetGroupsUrl = (format) => {
	return `/groups.${format}`;
};
const getGroups = async (format, options) => {
	const res = await customFetch(getGetGroupsUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateGroupUrl = (format) => {
	return `/groups.${format}`;
};
const createGroup = async (format, createGroupBody$1, options) => {
	const res = await customFetch(getCreateGroupUrl(format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createGroupBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetGroupUrl = (groupId, format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/groups/${groupId}.${format}?${stringifiedParams}` : `/groups/${groupId}.${format}`;
};
const getGroup = async (groupId, format, params, options) => {
	const res = await customFetch(getGetGroupUrl(groupId, format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateGroupUrl = (groupId, format) => {
	return `/groups/${groupId}.${format}`;
};
const updateGroup = async (groupId, format, updateGroupBody$1, options) => {
	const res = await customFetch(getUpdateGroupUrl(groupId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateGroupBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getDeleteGroupUrl = (groupId, format) => {
	return `/groups/${groupId}.${format}`;
};
const deleteGroup = async (groupId, format, options) => {
	const res = await customFetch(getDeleteGroupUrl(groupId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getAddUserToGroupUrl = (groupId, format) => {
	return `/groups/${groupId}/users.${format}`;
};
const addUserToGroup = async (groupId, format, addUserToGroupBody$1, options) => {
	const res = await customFetch(getAddUserToGroupUrl(groupId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(addUserToGroupBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getRemoveUserFromGroupUrl = (groupId, userId, format) => {
	return `/groups/${groupId}/users/${userId}.${format}`;
};
const removeUserFromGroup = async (groupId, userId, format, options) => {
	const res = await customFetch(getRemoveUserFromGroupUrl(groupId, userId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetCustomFieldsUrl = (format) => {
	return `/custom_fields.${format}`;
};
const getCustomFields = async (format, options) => {
	const res = await customFetch(getGetCustomFieldsUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getSearchUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/search.${format}?${stringifiedParams}` : `/search.${format}`;
};
const search = async (format, params, options) => {
	const res = await customFetch(getSearchUrl(format, params), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetFilesUrl = (projectId, format) => {
	return `/projects/${projectId}/files.${format}`;
};
const getFiles = async (projectId, format, options) => {
	const res = await customFetch(getGetFilesUrl(projectId, format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getCreateFileUrl = (projectId, format) => {
	return `/projects/${projectId}/files.${format}`;
};
const createFile = async (projectId, format, createFileBody$1, options) => {
	const res = await customFetch(getCreateFileUrl(projectId, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(createFileBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getGetMyAccountUrl = (format) => {
	return `/my/account.${format}`;
};
const getMyAccount = async (format, options) => {
	const res = await customFetch(getGetMyAccountUrl(format), {
		...options,
		method: "GET"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateMyAccountUrl = (format) => {
	return `/my/account.${format}`;
};
const updateMyAccount = async (format, updateMyAccountBody$1, options) => {
	const res = await customFetch(getUpdateMyAccountUrl(format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateMyAccountBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUpdateJournalUrl = (journalId, format) => {
	return `/journals/${journalId}.${format}`;
};
const updateJournal = async (journalId, format, updateJournalBody$1, options) => {
	const res = await customFetch(getUpdateJournalUrl(journalId, format), {
		...options,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(updateJournalBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getUploadAttachmentFileUrl = (format, params) => {
	const normalizedParams = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value !== void 0) normalizedParams.append(key, value === null ? "null" : value.toString());
	});
	const stringifiedParams = normalizedParams.toString();
	return stringifiedParams.length > 0 ? `/uploads.${format}?${stringifiedParams}` : `/uploads.${format}`;
};
const getAddRelatedIssueUrl = (projectId, repositoryId, revision, format) => {
	return `/projects/${projectId}/repository/${repositoryId}/revisions/${revision}/issues.${format}`;
};
const addRelatedIssue = async (projectId, repositoryId, revision, format, addRelatedIssueBody$1, options) => {
	const res = await customFetch(getAddRelatedIssueUrl(projectId, repositoryId, revision, format), {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers
		},
		body: JSON.stringify(addRelatedIssueBody$1)
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};
const getRemoveRelatedIssueUrl = (projectId, repositoryId, revision, issueId, format) => {
	return `/projects/${projectId}/repository/${repositoryId}/revisions/${revision}/issues/${issueId}.${format}`;
};
const removeRelatedIssue = async (projectId, repositoryId, revision, issueId, format, options) => {
	const res = await customFetch(getRemoveRelatedIssueUrl(projectId, repositoryId, revision, issueId, format), {
		...options,
		method: "DELETE"
	});
	const body = [
		204,
		205,
		304
	].includes(res.status) ? null : await res.text();
	const data = body ? JSON.parse(body) : {};
	return {
		data,
		status: res.status,
		headers: res.headers
	};
};

//#endregion
//#region src/__generated__/handlers.ts
const getIssuesHandler = async (args) => {
	const res = await getIssues(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createIssueHandler = async (args) => {
	const res = await createIssue(args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssueHandler = async (args) => {
	const res = await getIssue(args.pathParams.issueId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateIssueHandler = async (args) => {
	const res = await updateIssue(args.pathParams.issueId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteIssueHandler = async (args) => {
	const res = await deleteIssue(args.pathParams.issueId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const addWatcherHandler = async (args) => {
	const res = await addWatcher(args.pathParams.issueId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const removeWatcherHandler = async (args) => {
	const res = await removeWatcher(args.pathParams.issueId, args.pathParams.userId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getProjectsHandler = async (args) => {
	const res = await getProjects(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createProjectHandler = async (args) => {
	const res = await createProject(args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getProjectHandler = async (args) => {
	const res = await getProject(args.pathParams.projectId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateProjectHandler = async (args) => {
	const res = await updateProject(args.pathParams.projectId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteProjectHandler = async (args) => {
	const res = await deleteProject(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const archiveProjectHandler = async (args) => {
	const res = await archiveProject(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const unarchiveProjectHandler = async (args) => {
	const res = await unarchiveProject(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getMembershipsHandler = async (args) => {
	const res = await getMemberships(args.pathParams.projectId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createMembershipHandler = async (args) => {
	const res = await createMembership(args.pathParams.projectId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getMembershipHandler = async (args) => {
	const res = await getMembership(args.pathParams.membershipId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateMembershipHandler = async (args) => {
	const res = await updateMembership(args.pathParams.membershipId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteMembershipHandler = async (args) => {
	const res = await deleteMembership(args.pathParams.membershipId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const closeProjectHandler = async (args) => {
	const res = await closeProject(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const reopenProjectHandler = async (args) => {
	const res = await reopenProject(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getUsersHandler = async (args) => {
	const res = await getUsers(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createUserHandler = async (args) => {
	const res = await createUser(args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getUserHandler = async (args) => {
	const res = await getUser(args.pathParams.userId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateUserHandler = async (args) => {
	const res = await updateUser(args.pathParams.userId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteUserHandler = async (args) => {
	const res = await deleteUser(args.pathParams.userId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getCurrentUserHandler = async (args) => {
	const res = await getCurrentUser(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getTimeEntriesHandler = async (args) => {
	const res = await getTimeEntries(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createTimeEntryHandler = async (args) => {
	const res = await createTimeEntry(args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getTimeEntryHandler = async (args) => {
	const res = await getTimeEntry(args.pathParams.timeEntryId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateTimeEntryHandler = async (args) => {
	const res = await updateTimeEntry(args.pathParams.timeEntryId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteTimeEntryHandler = async (args) => {
	const res = await deleteTimeEntry(args.pathParams.timeEntryId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getNewsListHandler = async (args) => {
	const res = await getNewsList(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getNewsHandler = async (args) => {
	const res = await getNews(args.pathParams.newsId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateNewsHandler = async (args) => {
	const res = await updateNews(args.pathParams.newsId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteNewsHandler = async (args) => {
	const res = await deleteNews(args.pathParams.newsId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getNewsListByProjectHandler = async (args) => {
	const res = await getNewsListByProject(args.pathParams.projectId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createNewsHandler = async (args) => {
	const res = await createNews(args.pathParams.projectId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssueRelationsHandler = async (args) => {
	const res = await getIssueRelations(args.pathParams.issueId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createIssueRelationHandler = async (args) => {
	const res = await createIssueRelation(args.pathParams.issueId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssueRelationHandler = async (args) => {
	const res = await getIssueRelation(args.pathParams.issueRelationId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteIssueRelationHandler = async (args) => {
	const res = await deleteIssueRelation(args.pathParams.issueRelationId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getVersionsByProjectHandler = async (args) => {
	const res = await getVersionsByProject(args.pathParams.projectId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createVersionHandler = async (args) => {
	const res = await createVersion(args.pathParams.projectId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getVersionsHandler = async (args) => {
	const res = await getVersions(args.pathParams.versionId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateVersionHandler = async (args) => {
	const res = await updateVersion(args.pathParams.versionId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteVersionHandler = async (args) => {
	const res = await deleteVersion(args.pathParams.versionId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getWikiPagesHandler = async (args) => {
	const res = await getWikiPages(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getWikiPageHandler = async (args) => {
	const res = await getWikiPage(args.pathParams.projectId, args.pathParams.wikiPageTitle, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateWikiPageHandler = async (args) => {
	const res = await updateWikiPage(args.pathParams.projectId, args.pathParams.wikiPageTitle, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteWikiPageHandler = async (args) => {
	const res = await deleteWikiPage(args.pathParams.projectId, args.pathParams.wikiPageTitle, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getWikiPageByVersionHandler = async (args) => {
	const res = await getWikiPageByVersion(args.pathParams.projectId, args.pathParams.wikiPageTitle, args.pathParams.versionId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getQueriesHandler = async (args) => {
	const res = await getQueries(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getAttachmentHandler = async (args) => {
	const res = await getAttachment(args.pathParams.attachmentId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateAttachmentHandler = async (args) => {
	const res = await updateAttachment(args.pathParams.attachmentId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteAttachmentHandler = async (args) => {
	const res = await deleteAttachment(args.pathParams.attachmentId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssueStatusesHandler = async (args) => {
	const res = await getIssueStatuses(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getTrackersHandler = async (args) => {
	const res = await getTrackers(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssueCategoriesHandler = async (args) => {
	const res = await getIssueCategories(args.pathParams.projectId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createIssueCategoryHandler = async (args) => {
	const res = await createIssueCategory(args.pathParams.projectId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssuePrioritiesHandler = async (args) => {
	const res = await getIssuePriorities(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getTimeEntryActivitiesHandler = async (args) => {
	const res = await getTimeEntryActivities(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getDocumentCategoriesHandler = async (args) => {
	const res = await getDocumentCategories(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getIssueCategoryHandler = async (args) => {
	const res = await getIssueCategory(args.pathParams.issueCategoryId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateIssueCategoryHandler = async (args) => {
	const res = await updateIssueCategory(args.pathParams.issueCategoryId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteIssueCategoryHandler = async (args) => {
	const res = await deleteIssueCategory(args.pathParams.issueCategoryId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getRolesHandler = async (args) => {
	const res = await getRoles(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getRoleHandler = async (args) => {
	const res = await getRole(args.pathParams.roleId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getGroupsHandler = async (args) => {
	const res = await getGroups(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createGroupHandler = async (args) => {
	const res = await createGroup(args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getGroupHandler = async (args) => {
	const res = await getGroup(args.pathParams.groupId, args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateGroupHandler = async (args) => {
	const res = await updateGroup(args.pathParams.groupId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const deleteGroupHandler = async (args) => {
	const res = await deleteGroup(args.pathParams.groupId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const addUserToGroupHandler = async (args) => {
	const res = await addUserToGroup(args.pathParams.groupId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const removeUserFromGroupHandler = async (args) => {
	const res = await removeUserFromGroup(args.pathParams.groupId, args.pathParams.userId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getCustomFieldsHandler = async (args) => {
	const res = await getCustomFields(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const searchHandler = async (args) => {
	const res = await search(args.pathParams.format, args.queryParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getFilesHandler = async (args) => {
	const res = await getFiles(args.pathParams.projectId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const createFileHandler = async (args) => {
	const res = await createFile(args.pathParams.projectId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const getMyAccountHandler = async (args) => {
	const res = await getMyAccount(args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateMyAccountHandler = async (args) => {
	const res = await updateMyAccount(args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const updateJournalHandler = async (args) => {
	const res = await updateJournal(args.pathParams.journalId, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const addRelatedIssueHandler = async (args) => {
	const res = await addRelatedIssue(args.pathParams.projectId, args.pathParams.repositoryId, args.pathParams.revision, args.pathParams.format, args.bodyParams);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};
const removeRelatedIssueHandler = async (args) => {
	const res = await removeRelatedIssue(args.pathParams.projectId, args.pathParams.repositoryId, args.pathParams.revision, args.pathParams.issueId, args.pathParams.format);
	return { content: [{
		type: "text",
		text: JSON.stringify(res)
	}] };
};

//#endregion
//#region src/__generated__/tool-schemas.zod.ts
const getIssuesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getIssuesQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional(),
	"sort": z.string().optional(),
	"include": z.array(z.enum(["attachments", "relations"])).optional(),
	"issue_id": z.array(z.string()).optional(),
	"project_id": z.array(z.string()).optional(),
	"subproject_id": z.array(z.string()).optional(),
	"tracker_id": z.array(z.string()).optional(),
	"status_id": z.array(z.string()).optional(),
	"assigned_to_id": z.array(z.string()).optional(),
	"parent_id": z.array(z.string()).optional(),
	"cf_x": z.record(z.string(), z.string()).optional(),
	"author_id": z.array(z.string()).optional(),
	"member_of_group": z.array(z.string()).optional(),
	"assigned_to_role": z.array(z.string()).optional(),
	"fixed_version_id": z.array(z.string()).optional(),
	"fixed_version.due_date": z.string().optional(),
	"fixed_version.status": z.array(z.string()).optional(),
	"category_id": z.array(z.string()).optional(),
	"subject": z.string().optional(),
	"description": z.string().optional(),
	"notes": z.string().optional(),
	"created_on": z.string().optional(),
	"updated_on": z.string().optional(),
	"closed_on": z.string().optional(),
	"start_date": z.string().optional(),
	"due_date": z.string().optional(),
	"estimated_hours": z.string().optional(),
	"spent_time": z.string().optional(),
	"done_ratio": z.string().optional(),
	"is_private": z.string().optional(),
	"attachment": z.string().optional(),
	"attachment_description": z.string().optional(),
	"watcher_id": z.array(z.string()).optional(),
	"updated_by": z.array(z.string()).optional(),
	"last_updated_by": z.array(z.string()).optional(),
	"project.status": z.number().optional(),
	"relation_type": z.array(z.string()).optional(),
	"child_id": z.array(z.string()).optional(),
	"query_id": z.number().optional()
});
const getIssuesHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getIssuesResponse = z.object({
	"issues": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"tracker": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"status": z.object({
			"id": z.number(),
			"name": z.string(),
			"is_closed": z.boolean()
		}),
		"priority": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"assigned_to": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional(),
		"category": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional(),
		"subject": z.string(),
		"description": z.string().nullable(),
		"start_date": z.string().nullable(),
		"due_date": z.string().nullable(),
		"done_ratio": z.number(),
		"is_private": z.boolean(),
		"estimated_hours": z.number().nullable(),
		"total_estimated_hours": z.number().nullable(),
		"spent_hours": z.number().optional(),
		"total_spent_hours": z.number().optional(),
		"custom_fields": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"multiple": z.boolean().optional()
		})).optional(),
		"created_on": z.string().datetime({}),
		"updated_on": z.string().datetime({}),
		"closed_on": z.string().datetime({}).nullable()
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const createIssueParams = z.object({ "format": z.enum(["json", "xml"]) });
const createIssueHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createIssueBodyIssueDoneRatioMin = 0;
const createIssueBodyIssueDoneRatioMax = 100;
const createIssueBody = z.object({ "issue": z.object({
	"project_id": z.number(),
	"tracker_id": z.number().optional(),
	"status_id": z.number().optional(),
	"priority_id": z.number().optional(),
	"subject": z.string(),
	"description": z.string().nullish(),
	"start_date": z.string().date().nullish(),
	"due_date": z.string().date().nullish(),
	"done_ratio": z.number().min(createIssueBodyIssueDoneRatioMin).max(createIssueBodyIssueDoneRatioMax).optional(),
	"category_id": z.number().nullish(),
	"fixed_version_id": z.number().nullish(),
	"assigned_to_id": z.number().nullish(),
	"parent_issue_id": z.number().nullish(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional(),
	"watcher_user_ids": z.array(z.number()).optional(),
	"is_private": z.boolean().optional(),
	"estimated_hours": z.number().nullish(),
	"uploads": z.array(z.object({
		"token": z.string().optional(),
		"filename": z.string().optional(),
		"description": z.string().optional(),
		"content_type": z.string().optional()
	})).optional()
}) });
const getIssueParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number()
});
const getIssueQueryParams = z.object({ "include": z.array(z.enum([
	"children",
	"attachments",
	"relations",
	"changesets",
	"journals",
	"watchers",
	"allowed_statuses"
])).optional() });
const getIssueHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssueResponse = z.object({ "issue": z.object({
	"id": z.number(),
	"project": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"tracker": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"status": z.object({
		"id": z.number(),
		"name": z.string(),
		"is_closed": z.boolean()
	}),
	"priority": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"author": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"assigned_to": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"category": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"subject": z.string(),
	"description": z.string().nullable(),
	"start_date": z.string().nullable(),
	"due_date": z.string().nullable(),
	"done_ratio": z.number(),
	"is_private": z.boolean(),
	"estimated_hours": z.number().nullable(),
	"total_estimated_hours": z.number().nullable(),
	"spent_hours": z.number().optional(),
	"total_spent_hours": z.number().optional(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({}),
	"closed_on": z.string().datetime({}).nullable(),
	"changesets": z.array(z.string()).optional(),
	"children": z.array(z.object({
		"id": z.number(),
		"tracker": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"subject": z.string()
	})).optional(),
	"attachments": z.array(z.object({
		"id": z.number(),
		"filename": z.string(),
		"filesize": z.number(),
		"content_type": z.string(),
		"description": z.string(),
		"content_url": z.string(),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"created_on": z.string(),
		"thumbnail_url": z.string().optional()
	})).optional(),
	"relations": z.array(z.object({
		"id": z.number().optional(),
		"issue_id": z.number().optional(),
		"issue_to_id": z.number().optional(),
		"relation_type": z.string().optional(),
		"delay": z.number().nullish()
	})).optional(),
	"journals": z.array(z.object({
		"id": z.number(),
		"user": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"notes": z.string(),
		"created_on": z.string().datetime({}),
		"private_notes": z.boolean(),
		"details": z.array(z.object({
			"property": z.string(),
			"name": z.string(),
			"old_value": z.string().nullable(),
			"new_value": z.string().nullable()
		}))
	})).optional(),
	"watchers": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"allowed_statuses": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"is_closed": z.boolean()
	})).optional()
}) });
const updateIssueParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number()
});
const updateIssueHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateIssueBodyIssueDoneRatioMin = 0;
const updateIssueBodyIssueDoneRatioMax = 100;
const updateIssueBody = z.object({ "issue": z.object({
	"project_id": z.number().optional(),
	"tracker_id": z.number().optional(),
	"status_id": z.number().optional(),
	"priority_id": z.number().optional(),
	"subject": z.string().optional(),
	"description": z.string().nullish(),
	"start_date": z.string().date().nullish(),
	"due_date": z.string().date().nullish(),
	"done_ratio": z.number().min(updateIssueBodyIssueDoneRatioMin).max(updateIssueBodyIssueDoneRatioMax).optional(),
	"category_id": z.number().nullish(),
	"fixed_version_id": z.number().nullish(),
	"assigned_to_id": z.number().nullish(),
	"parent_issue_id": z.number().nullish(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional(),
	"watcher_user_ids": z.array(z.number()).optional(),
	"is_private": z.boolean().optional(),
	"estimated_hours": z.number().nullish(),
	"notes": z.string().optional(),
	"private_notes": z.string().optional(),
	"uploads": z.array(z.object({
		"token": z.string().optional(),
		"filename": z.string().optional(),
		"description": z.string().optional(),
		"content_type": z.string().optional()
	})).optional()
}).optional() });
const deleteIssueParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number()
});
const deleteIssueHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const addWatcherParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number()
});
const addWatcherHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const addWatcherBody = z.object({ "user_id": z.number() });
const removeWatcherParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number(),
	"userId": z.number()
});
const removeWatcherHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getProjectsParams = z.object({ "format": z.enum(["json", "xml"]) });
const getProjectsQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional(),
	"include": z.array(z.enum([
		"trackers",
		"issue_categories",
		"time_entry_activities",
		"enabled_modules",
		"issue_custom_fields"
	])).optional(),
	"status": z.array(z.number()).optional(),
	"id": z.array(z.string()).optional(),
	"name": z.string().optional(),
	"description": z.string().optional(),
	"parent_id": z.array(z.string()).optional(),
	"is_public": z.array(z.enum(["0", "1"])).optional(),
	"created_on": z.string().optional()
});
const getProjectsHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getProjectsResponse = z.object({
	"projects": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"identifier": z.string(),
		"description": z.string().nullable(),
		"parent": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional(),
		"status": z.number(),
		"is_public": z.boolean(),
		"inherit_members": z.boolean(),
		"custom_fields": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"multiple": z.boolean().optional()
		})).optional(),
		"trackers": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		})).optional(),
		"issue_categories": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		})).optional(),
		"time_entry_activities": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		})).optional(),
		"enabled_modules": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		})).optional(),
		"issue_custom_fields": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		})).optional(),
		"created_on": z.string().datetime({}),
		"updated_on": z.string().datetime({})
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const createProjectParams = z.object({ "format": z.enum(["json", "xml"]) });
const createProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createProjectBody = z.object({ "project": z.object({
	"name": z.string(),
	"identifier": z.string(),
	"description": z.string().nullish(),
	"homepage": z.string().nullish(),
	"is_public": z.boolean().optional(),
	"parent_id": z.number().nullish(),
	"inherit_members": z.boolean().optional(),
	"default_assigned_to_id": z.number().nullish(),
	"default_version_id": z.number().nullish(),
	"tracker_ids": z.array(z.number()).optional(),
	"enabled_module_names": z.array(z.string()).optional(),
	"issue_custom_field_ids": z.array(z.number()).optional(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}) });
const getProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getProjectQueryParams = z.object({ "include": z.array(z.enum([
	"trackers",
	"issue_categories",
	"time_entry_activities",
	"enabled_modules",
	"issue_custom_fields"
])).optional() });
const getProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getProjectResponse = z.object({ "project": z.object({
	"id": z.number(),
	"name": z.string(),
	"identifier": z.string(),
	"description": z.string().nullable(),
	"homepage": z.string().nullish(),
	"parent": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"status": z.number(),
	"is_public": z.boolean(),
	"inherit_members": z.boolean(),
	"default_version": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"default_assignee": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional(),
	"trackers": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"issue_categories": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"time_entry_activities": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"enabled_modules": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"issue_custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({})
}) });
const updateProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const updateProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateProjectBody = z.object({ "project": z.object({
	"name": z.string().optional(),
	"description": z.string().nullish(),
	"homepage": z.string().nullish(),
	"is_public": z.boolean().optional(),
	"parent_id": z.number().nullish(),
	"inherit_members": z.boolean().optional(),
	"default_assigned_to_id": z.number().nullish(),
	"default_version_id": z.number().nullish(),
	"tracker_ids": z.array(z.number()).optional(),
	"enabled_module_names": z.array(z.string()).optional(),
	"issue_custom_field_ids": z.array(z.number()).optional(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}).optional() });
const deleteProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const deleteProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const archiveProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const archiveProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const unarchiveProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const unarchiveProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getMembershipsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getMembershipsQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional()
});
const getMembershipsHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getMembershipsResponse = z.object({
	"memberships": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"user": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional(),
		"group": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional(),
		"roles": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		}))
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const createMembershipParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const createMembershipHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createMembershipBody = z.object({ "membership": z.object({
	"user_id": z.number(),
	"role_ids": z.array(z.number())
}) });
const getMembershipParams = z.object({
	"format": z.enum(["json", "xml"]),
	"membershipId": z.number()
});
const getMembershipHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getMembershipResponse = z.object({ "membership": z.object({
	"id": z.number(),
	"project": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"user": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"group": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"roles": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	}))
}) });
const updateMembershipParams = z.object({
	"format": z.enum(["json", "xml"]),
	"membershipId": z.number()
});
const updateMembershipHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateMembershipBody = z.object({ "membership": z.object({ "role_ids": z.array(z.number()) }).optional() });
const deleteMembershipParams = z.object({
	"format": z.enum(["json", "xml"]),
	"membershipId": z.number()
});
const deleteMembershipHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const closeProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const closeProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const reopenProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const reopenProjectHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getUsersParams = z.object({ "format": z.enum(["json", "xml"]) });
const getUsersQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional(),
	"status": z.number().optional(),
	"name": z.string().optional(),
	"group_id": z.number().optional()
});
const getUsersHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getUsersResponse = z.object({
	"users": z.array(z.object({
		"id": z.number(),
		"login": z.string(),
		"admin": z.boolean(),
		"firstname": z.string(),
		"lastname": z.string(),
		"mail": z.string(),
		"created_on": z.string().datetime({}),
		"updated_on": z.string().datetime({}),
		"last_login_on": z.string().datetime({}).nullable(),
		"passwd_changed_on": z.string().datetime({}).nullable(),
		"twofa_scheme": z.object({}).nullable(),
		"custom_fields": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"multiple": z.boolean().optional()
		})).optional()
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const createUserParams = z.object({ "format": z.enum(["json", "xml"]) });
const createUserHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createUserBody = z.object({
	"user": z.object({
		"login": z.string(),
		"admin": z.boolean().optional(),
		"password": z.string().optional(),
		"firstname": z.string(),
		"lastname": z.string(),
		"mail": z.string(),
		"language": z.string().optional(),
		"auth_source_id": z.number().nullish(),
		"mail_notification": z.enum([
			"all",
			"selected",
			"only_my_events",
			"only_assigned",
			"only_owner",
			"none"
		]).optional(),
		"notified_project_ids": z.array(z.number()).optional(),
		"must_change_passwd": z.boolean().optional(),
		"generate_password": z.boolean().optional(),
		"status": z.number().optional(),
		"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
		"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
	}),
	"send_information": z.boolean().optional(),
	"pref": z.object({
		"hide_mail": z.boolean().optional(),
		"time_zone": z.string().nullish(),
		"comments_sorting": z.enum(["asc", "desc"]).optional(),
		"warn_on_leaving_unsaved": z.boolean().optional(),
		"no_self_notified": z.boolean().optional(),
		"notify_about_high_priority_issues": z.boolean().optional(),
		"textarea_font": z.enum(["monospace", "proportional"]).nullish(),
		"recently_used_projects": z.number().optional(),
		"history_default_tab": z.enum([
			"notes",
			"history",
			"properties",
			"time_entries",
			"changesets",
			"last_tab_visited"
		]).optional(),
		"toolbar_language_options": z.string().optional(),
		"default_issue_query": z.number().nullish(),
		"default_project_query": z.number().nullish(),
		"auto_watch_on": z.enum(["issue_contributed_to"]).nullish()
	}).optional()
});
const getUserParams = z.object({
	"format": z.enum(["json", "xml"]),
	"userId": z.number()
});
const getUserQueryParams = z.object({ "include": z.array(z.enum(["memberships", "groups"])).optional() });
const getUserHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getUserResponse = z.object({ "user": z.object({
	"id": z.number(),
	"login": z.string(),
	"admin": z.boolean(),
	"firstname": z.string(),
	"lastname": z.string(),
	"mail": z.string(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({}),
	"last_login_on": z.string().datetime({}).nullable(),
	"passwd_changed_on": z.string().datetime({}).nullable(),
	"twofa_scheme": z.object({}).nullable(),
	"api_key": z.string(),
	"status": z.number(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional(),
	"groups": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"memberships": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"roles": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"inherited": z.boolean().optional()
		}))
	})).optional()
}) });
const updateUserParams = z.object({
	"format": z.enum(["json", "xml"]),
	"userId": z.number()
});
const updateUserHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateUserBody = z.object({
	"user": z.object({
		"login": z.string().optional(),
		"admin": z.boolean().optional(),
		"password": z.string().optional(),
		"firstname": z.string().optional(),
		"lastname": z.string().optional(),
		"mail": z.string().optional(),
		"language": z.string().optional(),
		"auth_source_id": z.number().nullish(),
		"mail_notification": z.enum([
			"all",
			"selected",
			"only_my_events",
			"only_assigned",
			"only_owner",
			"none"
		]).optional(),
		"notified_project_ids": z.array(z.number()).optional(),
		"must_change_passwd": z.boolean().optional(),
		"generate_password": z.boolean().optional(),
		"status": z.number().optional(),
		"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
		"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional(),
		"group_ids": z.array(z.number()).optional()
	}).optional(),
	"send_information": z.boolean().optional(),
	"pref": z.object({
		"hide_mail": z.boolean().optional(),
		"time_zone": z.string().nullish(),
		"comments_sorting": z.enum(["asc", "desc"]).optional(),
		"warn_on_leaving_unsaved": z.boolean().optional(),
		"no_self_notified": z.boolean().optional(),
		"notify_about_high_priority_issues": z.boolean().optional(),
		"textarea_font": z.enum(["monospace", "proportional"]).nullish(),
		"recently_used_projects": z.number().optional(),
		"history_default_tab": z.enum([
			"notes",
			"history",
			"properties",
			"time_entries",
			"changesets",
			"last_tab_visited"
		]).optional(),
		"toolbar_language_options": z.string().optional(),
		"default_issue_query": z.number().nullish(),
		"default_project_query": z.number().nullish(),
		"auto_watch_on": z.enum(["issue_contributed_to"]).nullish()
	}).optional()
});
const deleteUserParams = z.object({
	"format": z.enum(["json", "xml"]),
	"userId": z.number()
});
const deleteUserHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getCurrentUserParams = z.object({ "format": z.enum(["json", "xml"]) });
const getCurrentUserQueryParams = z.object({ "include": z.array(z.enum(["memberships", "groups"])).optional() });
const getCurrentUserHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getCurrentUserResponse = z.object({ "user": z.object({
	"id": z.number(),
	"login": z.string(),
	"admin": z.boolean(),
	"firstname": z.string(),
	"lastname": z.string(),
	"mail": z.string(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({}),
	"last_login_on": z.string().datetime({}).nullable(),
	"passwd_changed_on": z.string().datetime({}).nullable(),
	"twofa_scheme": z.object({}).nullable(),
	"api_key": z.string(),
	"status": z.number(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional(),
	"groups": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"memberships": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"roles": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"inherited": z.boolean().optional()
		}))
	})).optional()
}) });
const getTimeEntriesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getTimeEntriesQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional(),
	"user_id": z.array(z.string()).optional(),
	"project_id": z.array(z.string()).optional(),
	"spent_on": z.string().date().optional(),
	"from": z.string().date().optional(),
	"to": z.string().date().optional(),
	"subproject_id": z.array(z.string()).optional(),
	"issue_id": z.array(z.string()).optional(),
	"issue.tracker_id": z.array(z.string()).optional(),
	"issue.status_id": z.array(z.string()).optional(),
	"issue.fixed_version_id": z.array(z.string()).optional(),
	"issue.category_id": z.array(z.string()).optional(),
	"author_id": z.array(z.string()).optional(),
	"activity_id": z.array(z.string()).optional(),
	"project.status": z.array(z.string()).optional(),
	"comments": z.string().optional(),
	"hours": z.string().optional(),
	"sort": z.string().optional()
});
const getTimeEntriesHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getTimeEntriesResponse = z.object({
	"time_entries": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional(),
		"issue": z.object({ "id": z.number() }).optional(),
		"user": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"activity": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"hours": z.number(),
		"comments": z.string().nullable(),
		"spent_on": z.string().date(),
		"created_on": z.string().datetime({}),
		"updated_on": z.string().datetime({}),
		"custom_fields": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"multiple": z.boolean().optional()
		})).optional()
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const createTimeEntryParams = z.object({ "format": z.enum(["json", "xml"]) });
const createTimeEntryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createTimeEntryBody = z.object({ "time_entry": z.object({
	"issue_id": z.number().optional(),
	"project_id": z.number().optional(),
	"spent_on": z.string().date().optional(),
	"hours": z.number(),
	"activity_id": z.number().optional(),
	"comments": z.string().optional(),
	"user_id": z.number().optional(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}) });
const getTimeEntryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"timeEntryId": z.number()
});
const getTimeEntryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getTimeEntryResponse = z.object({ "time_entry": z.object({
	"id": z.number(),
	"project": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"issue": z.object({ "id": z.number() }).optional(),
	"user": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"activity": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"hours": z.number(),
	"comments": z.string().nullable(),
	"spent_on": z.string().date(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({}),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional()
}) });
const updateTimeEntryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"timeEntryId": z.number()
});
const updateTimeEntryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateTimeEntryBody = z.object({ "time_entry": z.object({
	"issue_id": z.number().optional(),
	"project_id": z.number().optional(),
	"spent_on": z.string().date().optional(),
	"hours": z.number(),
	"activity_id": z.number().optional(),
	"comments": z.string().optional(),
	"user_id": z.number().optional(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}).optional() });
const deleteTimeEntryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"timeEntryId": z.number()
});
const deleteTimeEntryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getNewsListParams = z.object({ "format": z.enum(["json", "xml"]) });
const getNewsListQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional()
});
const getNewsListHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getNewsListResponse = z.object({
	"news": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"title": z.string(),
		"summary": z.string().optional(),
		"description": z.string(),
		"created_on": z.string().datetime({}),
		"attachments": z.array(z.object({
			"id": z.number(),
			"filename": z.string(),
			"filesize": z.number(),
			"content_type": z.string(),
			"description": z.string(),
			"content_url": z.string(),
			"thumbnail_url": z.string().optional(),
			"author": z.object({
				"id": z.number(),
				"name": z.string()
			}),
			"created_on": z.string()
		})).optional(),
		"comments": z.array(z.object({
			"id": z.number(),
			"author": z.object({
				"id": z.number(),
				"name": z.string()
			}),
			"content": z.string()
		})).optional()
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const getNewsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"newsId": z.number()
});
const getNewsQueryParams = z.object({ "include": z.array(z.enum(["attachments", "comments"])).optional() });
const getNewsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getNewsResponse = z.object({ "news": z.object({
	"id": z.number(),
	"project": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"author": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"title": z.string(),
	"summary": z.string().optional(),
	"description": z.string(),
	"created_on": z.string().datetime({}),
	"attachments": z.array(z.object({
		"id": z.number(),
		"filename": z.string(),
		"filesize": z.number(),
		"content_type": z.string(),
		"description": z.string(),
		"content_url": z.string(),
		"thumbnail_url": z.string().optional(),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"created_on": z.string()
	})).optional(),
	"comments": z.array(z.object({
		"id": z.number(),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"content": z.string()
	})).optional()
}) });
const updateNewsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"newsId": z.number()
});
const updateNewsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateNewsBody = z.object({ "news": z.object({
	"title": z.string().optional(),
	"summary": z.string().optional(),
	"description": z.string().optional(),
	"uploads": z.array(z.object({
		"token": z.string().optional(),
		"filename": z.string().optional(),
		"description": z.string().optional(),
		"content_type": z.string().optional()
	})).optional()
}).optional() });
const deleteNewsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"newsId": z.number()
});
const deleteNewsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getNewsListByProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getNewsListByProjectQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional()
});
const getNewsListByProjectHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getNewsListByProjectResponse = z.object({
	"news": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"title": z.string(),
		"summary": z.string().optional(),
		"description": z.string(),
		"created_on": z.string().datetime({}),
		"attachments": z.array(z.object({
			"id": z.number(),
			"filename": z.string(),
			"filesize": z.number(),
			"content_type": z.string(),
			"description": z.string(),
			"content_url": z.string(),
			"thumbnail_url": z.string().optional(),
			"author": z.object({
				"id": z.number(),
				"name": z.string()
			}),
			"created_on": z.string()
		})).optional(),
		"comments": z.array(z.object({
			"id": z.number(),
			"author": z.object({
				"id": z.number(),
				"name": z.string()
			}),
			"content": z.string()
		})).optional()
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const createNewsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const createNewsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createNewsBody = z.object({ "news": z.object({
	"title": z.string().optional(),
	"summary": z.string().optional(),
	"description": z.string().optional(),
	"uploads": z.array(z.object({
		"token": z.string().optional(),
		"filename": z.string().optional(),
		"description": z.string().optional(),
		"content_type": z.string().optional()
	})).optional()
}) });
const getIssueRelationsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number()
});
const getIssueRelationsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssueRelationsResponse = z.object({ "relations": z.array(z.object({
	"id": z.number(),
	"issue_id": z.number(),
	"issue_to_id": z.number(),
	"relation_type": z.string(),
	"delay": z.number().nullable()
})) });
const createIssueRelationParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueId": z.number()
});
const createIssueRelationHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createIssueRelationBody = z.object({ "relation": z.object({
	"issue_to_id": z.number(),
	"relation_type": z.enum([
		"relates",
		"duplicates",
		"duplicated",
		"blocks",
		"blocked",
		"precedes",
		"follows",
		"copied_to",
		"copied_from"
	]),
	"delay": z.number().nullish()
}) });
const getIssueRelationParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueRelationId": z.number()
});
const getIssueRelationHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssueRelationResponse = z.object({ "relation": z.object({
	"id": z.number(),
	"issue_id": z.number(),
	"issue_to_id": z.number(),
	"relation_type": z.string(),
	"delay": z.number().nullable()
}) });
const deleteIssueRelationParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueRelationId": z.number()
});
const deleteIssueRelationHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getVersionsByProjectParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getVersionsByProjectQueryParams = z.object({ "nometa": z.literal(1).optional() });
const getVersionsByProjectHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getVersionsByProjectResponse = z.object({
	"versions": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"name": z.string(),
		"description": z.string().nullable(),
		"status": z.enum([
			"open",
			"locked",
			"closed"
		]),
		"due_date": z.string().date().nullable(),
		"sharing": z.enum([
			"none",
			"descendants",
			"hierarchy",
			"tree",
			"system"
		]),
		"wiki_page_title": z.string().nullable(),
		"custom_fields": z.array(z.object({
			"id": z.number(),
			"name": z.string(),
			"multiple": z.boolean().optional()
		})).optional(),
		"created_on": z.string().datetime({}),
		"updated_on": z.string().datetime({})
	})),
	"total_count": z.number().optional()
});
const createVersionParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const createVersionHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createVersionBody = z.object({ "version": z.object({
	"name": z.string(),
	"status": z.enum([
		"open",
		"locked",
		"closed"
	]).optional(),
	"sharing": z.enum([
		"none",
		"descendants",
		"hierarchy",
		"tree",
		"system"
	]).optional(),
	"due_date": z.string().date().nullish(),
	"description": z.string().optional(),
	"wiki_page_title": z.string().nullish(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}) });
const getVersionsParams = z.object({
	"format": z.enum(["json", "xml"]),
	"versionId": z.number()
});
const getVersionsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getVersionsResponse = z.object({ "version": z.object({
	"id": z.number(),
	"project": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"name": z.string(),
	"description": z.string().nullable(),
	"status": z.enum([
		"open",
		"locked",
		"closed"
	]),
	"due_date": z.string().date().nullable(),
	"sharing": z.enum([
		"none",
		"descendants",
		"hierarchy",
		"tree",
		"system"
	]),
	"wiki_page_title": z.string().nullable(),
	"estimated_hours": z.number().optional(),
	"spent_hours": z.number().optional(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({})
}) });
const updateVersionParams = z.object({
	"format": z.enum(["json", "xml"]),
	"versionId": z.number()
});
const updateVersionHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateVersionBody = z.object({ "version": z.object({
	"name": z.string().optional(),
	"status": z.enum([
		"open",
		"locked",
		"closed"
	]).optional(),
	"sharing": z.enum([
		"none",
		"descendants",
		"hierarchy",
		"tree",
		"system"
	]).optional(),
	"due_date": z.string().date().nullish(),
	"description": z.string().optional(),
	"wiki_page_title": z.string().nullish(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}).optional() });
const deleteVersionParams = z.object({
	"format": z.enum(["json", "xml"]),
	"versionId": z.number()
});
const deleteVersionHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getWikiPagesParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getWikiPagesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getWikiPagesResponse = z.object({ "wiki_pages": z.array(z.object({
	"title": z.number(),
	"parent": z.object({ "title": z.string() }).optional(),
	"version": z.number(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({})
})) });
const getWikiPageParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number(),
	"wikiPageTitle": z.string()
});
const getWikiPageQueryParams = z.object({ "include": z.enum(["attachments"]).optional() });
const getWikiPageHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getWikiPageResponse = z.object({ "wiki_page": z.object({
	"title": z.string(),
	"parent": z.object({ "title": z.string() }).optional(),
	"text": z.string(),
	"version": z.number(),
	"author": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"comments": z.string().nullable(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({}),
	"attachments": z.array(z.object({
		"id": z.number(),
		"filename": z.string(),
		"filesize": z.number(),
		"content_type": z.string(),
		"description": z.string(),
		"content_url": z.string(),
		"thumbnail_url": z.string().optional(),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"created_on": z.string()
	})).optional()
}) });
const updateWikiPageParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number(),
	"wikiPageTitle": z.string()
});
const updateWikiPageHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateWikiPageBody = z.object({ "wiki_page": z.object({
	"text": z.string(),
	"comments": z.string().optional(),
	"version": z.number().optional()
}).optional() });
const deleteWikiPageParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number(),
	"wikiPageTitle": z.string()
});
const deleteWikiPageHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getWikiPageByVersionParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number(),
	"wikiPageTitle": z.string(),
	"versionId": z.number()
});
const getWikiPageByVersionQueryParams = z.object({ "include": z.enum(["attachments"]).optional() });
const getWikiPageByVersionHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getWikiPageByVersionResponse = z.object({ "wiki_page": z.object({
	"title": z.string(),
	"parent": z.object({ "title": z.string() }).optional(),
	"text": z.string(),
	"version": z.number(),
	"author": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"comments": z.string().nullable(),
	"created_on": z.string().datetime({}),
	"updated_on": z.string().datetime({}),
	"attachments": z.array(z.object({
		"id": z.number(),
		"filename": z.string(),
		"filesize": z.number(),
		"content_type": z.string(),
		"description": z.string(),
		"content_url": z.string(),
		"thumbnail_url": z.string().optional(),
		"author": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"created_on": z.string()
	})).optional()
}) });
const getQueriesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getQueriesQueryParams = z.object({
	"offset": z.number().optional(),
	"limit": z.number().optional(),
	"nometa": z.literal(1).optional()
});
const getQueriesHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getQueriesResponse = z.object({
	"queries": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"is_public": z.boolean(),
		"project_id": z.number().nullable()
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const getAttachmentParams = z.object({
	"format": z.enum(["json", "xml"]),
	"attachmentId": z.number()
});
const getAttachmentHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getAttachmentResponse = z.object({ "attachment": z.object({
	"id": z.number(),
	"filename": z.string(),
	"filesize": z.number(),
	"content_type": z.string(),
	"description": z.string(),
	"content_url": z.string(),
	"thumbnail_url": z.string().optional(),
	"author": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"created_on": z.string()
}) });
const updateAttachmentParams = z.object({
	"format": z.enum(["json", "xml"]),
	"attachmentId": z.number()
});
const updateAttachmentHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateAttachmentBody = z.object({ "attachment": z.object({
	"filename": z.string().optional(),
	"description": z.string().optional()
}).optional() });
const deleteAttachmentParams = z.object({
	"format": z.enum(["json", "xml"]),
	"attachmentId": z.number()
});
const deleteAttachmentHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const downloadAttachmentFileParams = z.object({
	"attachmentId": z.number(),
	"filename": z.string()
});
const downloadAttachmentFileHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const downloadThumbnailParams = z.object({ "attachmentId": z.number() });
const downloadThumbnailHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssueStatusesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getIssueStatusesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssueStatusesResponse = z.object({ "issue_statuses": z.array(z.object({
	"id": z.number(),
	"name": z.string(),
	"is_closed": z.boolean()
})) });
const getTrackersParams = z.object({ "format": z.enum(["json", "xml"]) });
const getTrackersHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getTrackersResponse = z.object({ "trackers": z.array(z.object({
	"id": z.number().optional(),
	"name": z.string().optional(),
	"default_status": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"description": z.string().nullish(),
	"enabled_standard_fields": z.array(z.string()).optional()
})) });
const getIssueCategoriesParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getIssueCategoriesQueryParams = z.object({ "nometa": z.literal(1).optional() });
const getIssueCategoriesHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const getIssueCategoriesResponse = z.object({
	"issue_categories": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"name": z.string(),
		"assigned_to": z.object({
			"id": z.number(),
			"name": z.string()
		}).optional()
	})),
	"total_count": z.number().optional()
});
const createIssueCategoryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const createIssueCategoryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createIssueCategoryBody = z.object({ "issue_category": z.object({
	"name": z.string(),
	"assigned_to_id": z.number().optional()
}) });
const getIssuePrioritiesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getIssuePrioritiesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssuePrioritiesResponse = z.object({ "issue_priorities": z.array(z.object({
	"id": z.number(),
	"name": z.string(),
	"is_default": z.boolean(),
	"active": z.boolean(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional()
})) });
const getTimeEntryActivitiesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getTimeEntryActivitiesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getTimeEntryActivitiesResponse = z.object({ "time_entry_activities": z.array(z.object({
	"id": z.number(),
	"name": z.string(),
	"is_default": z.boolean(),
	"active": z.boolean(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional()
})) });
const getDocumentCategoriesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getDocumentCategoriesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getDocumentCategoriesResponse = z.object({ "document_categories": z.array(z.object({
	"id": z.number(),
	"name": z.string(),
	"is_default": z.boolean(),
	"active": z.boolean(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional()
})) });
const getIssueCategoryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueCategoryId": z.number()
});
const getIssueCategoryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getIssueCategoryResponse = z.object({ "issue_category": z.object({
	"id": z.number(),
	"project": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"name": z.string(),
	"assigned_to": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional()
}) });
const updateIssueCategoryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueCategoryId": z.number()
});
const updateIssueCategoryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateIssueCategoryBody = z.object({ "issue_category": z.object({
	"name": z.string().optional(),
	"assigned_to_id": z.number().optional()
}).optional() });
const deleteIssueCategoryParams = z.object({
	"format": z.enum(["json", "xml"]),
	"issueCategoryId": z.number()
});
const deleteIssueCategoryQueryParams = z.object({ "reassign_to_id": z.number().optional() });
const deleteIssueCategoryHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getRolesParams = z.object({ "format": z.enum(["json", "xml"]) });
const getRolesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getRolesResponse = z.object({ "roles": z.array(z.object({
	"id": z.number(),
	"name": z.string()
})) });
const getRoleParams = z.object({
	"format": z.enum(["json", "xml"]),
	"roleId": z.number()
});
const getRoleHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getRoleResponse = z.object({ "role": z.object({
	"id": z.number(),
	"name": z.string(),
	"assignable": z.boolean(),
	"issues_visibility": z.string().optional(),
	"time_entries_visibility": z.string(),
	"users_visibility": z.string(),
	"permissions": z.array(z.string())
}) });
const getGroupsParams = z.object({ "format": z.enum(["json", "xml"]) });
const getGroupsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getGroupsResponse = z.object({ "groups": z.array(z.object({
	"id": z.number(),
	"name": z.string(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional()
})) });
const createGroupParams = z.object({ "format": z.enum(["json", "xml"]) });
const createGroupHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createGroupBody = z.object({ "group": z.object({
	"name": z.string().optional(),
	"user_ids": z.array(z.number()).optional(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}) });
const getGroupParams = z.object({
	"format": z.enum(["json", "xml"]),
	"groupId": z.number()
});
const getGroupQueryParams = z.object({ "include": z.array(z.enum(["users", "memberships"])).optional() });
const getGroupHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getGroupResponse = z.object({ "group": z.object({
	"id": z.number(),
	"name": z.string(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional(),
	"users": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"memberships": z.array(z.object({
		"id": z.number(),
		"project": z.object({
			"id": z.number(),
			"name": z.string()
		}),
		"roles": z.array(z.object({
			"id": z.number(),
			"name": z.string()
		}))
	})).optional()
}) });
const updateGroupParams = z.object({
	"format": z.enum(["json", "xml"]),
	"groupId": z.number()
});
const updateGroupHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateGroupBody = z.object({ "group": z.object({
	"name": z.string().optional(),
	"user_ids": z.array(z.number()).optional(),
	"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
	"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional()
}).optional() });
const deleteGroupParams = z.object({
	"format": z.enum(["json", "xml"]),
	"groupId": z.number()
});
const deleteGroupHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const addUserToGroupParams = z.object({
	"format": z.enum(["json", "xml"]),
	"groupId": z.number()
});
const addUserToGroupHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const addUserToGroupBody = z.object({ "user_id": z.number() });
const removeUserFromGroupParams = z.object({
	"format": z.enum(["json", "xml"]),
	"groupId": z.number(),
	"userId": z.number()
});
const removeUserFromGroupHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getCustomFieldsParams = z.object({ "format": z.enum(["json", "xml"]) });
const getCustomFieldsHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getCustomFieldsResponse = z.object({ "custom_fields": z.array(z.object({
	"id": z.number().optional(),
	"name": z.string().optional(),
	"customized_type": z.enum([
		"issue",
		"time_entry",
		"project",
		"version",
		"document",
		"user",
		"group",
		"time_entry_activity",
		"issue_priority",
		"document_category"
	]).optional(),
	"field_format": z.enum([
		"enumeration",
		"string",
		"version",
		"attachment",
		"user",
		"list",
		"link",
		"float",
		"int",
		"date",
		"bool",
		"text"
	]).optional(),
	"regexp": z.string().optional(),
	"min_length": z.number().nullish(),
	"max_length": z.number().nullish(),
	"is_required": z.boolean().optional(),
	"is_filter": z.boolean().optional(),
	"searchable": z.boolean().optional(),
	"multiple": z.boolean().optional(),
	"default_value": z.string().nullish(),
	"visible": z.boolean().optional(),
	"trackers": z.array(z.object({
		"id": z.number(),
		"name": z.string()
	})).optional(),
	"roles": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"assignable": z.boolean(),
		"issues_visibility": z.string().optional(),
		"time_entries_visibility": z.string(),
		"users_visibility": z.string(),
		"permissions": z.array(z.string())
	})).optional(),
	"possible_values": z.array(z.object({
		"value": z.string().optional(),
		"label": z.string().optional()
	})).optional()
})) });
const searchParams = z.object({ "format": z.enum(["json", "xml"]) });
const searchQueryParams = z.object({
	"limit": z.number().optional(),
	"offset": z.number().optional(),
	"nometa": z.literal(1).optional(),
	"q": z.string(),
	"scope": z.enum([
		"all",
		"my_project",
		"subprojects"
	]).optional(),
	"all_words": z.literal(1).optional(),
	"titles_only": z.literal(1).optional(),
	"issues": z.literal(1).optional(),
	"news": z.literal(1).optional(),
	"wiki_pages": z.literal(1).optional(),
	"projects": z.literal(1).optional(),
	"documents": z.literal(1).optional(),
	"changesets": z.literal(1).optional(),
	"messages": z.literal(1).optional(),
	"open_issues": z.literal(1).optional(),
	"attachments": z.enum([
		"0",
		"1",
		"only"
	]).optional()
});
const searchHeader = z.object({
	"X-Redmine-Switch-User": z.string().optional(),
	"X-Redmine-Nometa": z.literal(1).optional()
});
const searchResponse = z.object({
	"results": z.array(z.object({
		"id": z.number(),
		"title": z.string(),
		"type": z.string(),
		"url": z.string(),
		"description": z.string(),
		"datetime": z.string().datetime({})
	})),
	"total_count": z.number().optional(),
	"offset": z.number().optional(),
	"limit": z.number().optional()
});
const getFilesParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const getFilesHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getFilesResponse = z.object({ "files": z.array(z.object({
	"id": z.number(),
	"filename": z.string(),
	"filesize": z.number(),
	"content_type": z.string(),
	"description": z.string(),
	"content_url": z.string(),
	"thumbnail_url": z.string().optional(),
	"author": z.object({
		"id": z.number(),
		"name": z.string()
	}),
	"created_on": z.string().datetime({}),
	"version": z.object({
		"id": z.number(),
		"name": z.string()
	}).optional(),
	"digest": z.string(),
	"downloads": z.number()
})) });
const createFileParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number()
});
const createFileHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const createFileBody = z.object({ "file": z.object({
	"token": z.string(),
	"version_id": z.number().optional(),
	"filename": z.string().optional(),
	"description": z.string().optional(),
	"content_type": z.string().optional()
}) });
const getMyAccountParams = z.object({ "format": z.enum(["json", "xml"]) });
const getMyAccountHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const getMyAccountResponse = z.object({ "user": z.object({
	"id": z.number(),
	"login": z.string(),
	"admin": z.boolean(),
	"firstname": z.string(),
	"lastname": z.string(),
	"mail": z.string(),
	"created_on": z.string().datetime({}),
	"last_login_on": z.string().datetime({}),
	"api_key": z.string(),
	"custom_fields": z.array(z.object({
		"id": z.number(),
		"name": z.string(),
		"multiple": z.boolean().optional()
	})).optional()
}) });
const updateMyAccountParams = z.object({ "format": z.enum(["json", "xml"]) });
const updateMyAccountHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateMyAccountBody = z.object({
	"user": z.object({
		"login": z.string().optional(),
		"admin": z.boolean().optional(),
		"password": z.string().optional(),
		"firstname": z.string().optional(),
		"lastname": z.string().optional(),
		"mail": z.string().optional(),
		"language": z.string().optional(),
		"auth_source_id": z.number().nullish(),
		"mail_notification": z.enum([
			"all",
			"selected",
			"only_my_events",
			"only_assigned",
			"only_owner",
			"none"
		]).optional(),
		"notified_project_ids": z.array(z.number()).optional(),
		"must_change_passwd": z.boolean().optional(),
		"generate_password": z.boolean().optional(),
		"status": z.number().optional(),
		"custom_fields": z.array(z.object({ "id": z.number() })).optional(),
		"custom_field_values": z.record(z.string(), z.any().describe("value: string? | string[]")).optional(),
		"group_ids": z.array(z.number()).optional()
	}).optional(),
	"pref": z.object({
		"hide_mail": z.boolean().optional(),
		"time_zone": z.string().nullish(),
		"comments_sorting": z.enum(["asc", "desc"]).optional(),
		"warn_on_leaving_unsaved": z.boolean().optional(),
		"no_self_notified": z.boolean().optional(),
		"notify_about_high_priority_issues": z.boolean().optional(),
		"textarea_font": z.enum(["monospace", "proportional"]).nullish(),
		"recently_used_projects": z.number().optional(),
		"history_default_tab": z.enum([
			"notes",
			"history",
			"properties",
			"time_entries",
			"changesets",
			"last_tab_visited"
		]).optional(),
		"toolbar_language_options": z.string().optional(),
		"default_issue_query": z.number().nullish(),
		"default_project_query": z.number().nullish(),
		"auto_watch_on": z.enum(["issue_contributed_to"]).nullish()
	}).optional()
});
const updateJournalParams = z.object({
	"format": z.enum(["json", "xml"]),
	"journalId": z.number()
});
const updateJournalHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const updateJournalBody = z.object({ "journal": z.object({
	"notes": z.string().nullish(),
	"private_notes": z.boolean().optional()
}).optional() });
const uploadAttachmentFileParams = z.object({ "format": z.enum(["json", "xml"]) });
const uploadAttachmentFileQueryParams = z.object({ "filename": z.string().optional() });
const uploadAttachmentFileHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const addRelatedIssueParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number(),
	"repositoryId": z.number(),
	"revision": z.string()
});
const addRelatedIssueHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });
const addRelatedIssueBody = z.object({ "issue_id": z.number() });
const removeRelatedIssueParams = z.object({
	"format": z.enum(["json", "xml"]),
	"projectId": z.number(),
	"repositoryId": z.number(),
	"revision": z.string(),
	"issueId": z.number()
});
const removeRelatedIssueHeader = z.object({ "X-Redmine-Switch-User": z.string().optional() });

//#endregion
//#region src/attachment/download-to-local-file-client.ts
async function downloadFileToLocalFromRedmine(attachmentId, filename, outputDir) {
	const downloadUrl = getDownloadAttachmentFileUrl(attachmentId, filename);
	const downloadResponse = await customFetch(downloadUrl);
	if (!downloadResponse.ok) throw new Error(`Failed to download file: ${downloadResponse.status} ${downloadResponse.statusText}`);
	const actualOutputDir = outputDir || os.tmpdir();
	if (!fs.existsSync(actualOutputDir)) fs.mkdirSync(actualOutputDir, { recursive: true });
	const timestamp = Date.now();
	const ext = path.extname(filename);
	const uniqueFilename = `redmine_attachment_${attachmentId}_${timestamp}${ext}`;
	const outputPath = path.join(actualOutputDir, uniqueFilename);
	const fileBuffer = await downloadResponse.arrayBuffer();
	fs.writeFileSync(outputPath, Buffer.from(fileBuffer));
	return {
		filePath: outputPath,
		filename
	};
}

//#endregion
//#region src/attachment/download-to-local-file-handler.ts
const downloadFileHandler = async (args) => {
	const result = await downloadFileToLocalFromRedmine(args.pathParams.attachmentId, args.pathParams.filename, args.pathParams.outputDir);
	return { content: [{
		type: "text",
		text: JSON.stringify({
			success: true,
			filePath: result.filePath,
			filename: result.filename,
			message: `File downloaded successfully to: ${result.filePath}`
		}, null, 2)
	}] };
};

//#endregion
//#region src/attachment/thumbnail-to-local-file-client.ts
async function downloadThumbnailToLocalFromRedmine(attachmentId, outputDir) {
	const downloadUrl = getDownloadThumbnailUrl(attachmentId);
	const downloadResponse = await customFetch(downloadUrl);
	if (!downloadResponse.ok) throw new Error(`Failed to download thumbnail: ${downloadResponse.status} ${downloadResponse.statusText}`);
	const actualOutputDir = outputDir || os.tmpdir();
	if (!fs.existsSync(actualOutputDir)) fs.mkdirSync(actualOutputDir, { recursive: true });
	const timestamp = Date.now();
	const uniqueFilename = `redmine_thumbnail_${attachmentId}_${timestamp}.png`;
	const outputPath = path.join(actualOutputDir, uniqueFilename);
	const fileBuffer = await downloadResponse.arrayBuffer();
	fs.writeFileSync(outputPath, Buffer.from(fileBuffer));
	return {
		filePath: outputPath,
		filename: uniqueFilename
	};
}

//#endregion
//#region src/attachment/thumbnail-to-local-file-handler.ts
const downloadThumbnailHandler = async (args) => {
	const result = await downloadThumbnailToLocalFromRedmine(args.pathParams.attachmentId, args.pathParams.outputDir);
	return { content: [{
		type: "text",
		text: JSON.stringify({
			success: true,
			filePath: result.filePath,
			filename: result.filename,
			message: `Thumbnail downloaded successfully to: ${result.filePath}`
		}, null, 2)
	}] };
};

//#endregion
//#region src/attachment/upload-local-file-client.ts
async function uploadLocalFileToRedmine(filePath, filename) {
	if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
	const fileBuffer = fs.readFileSync(filePath);
	const actualFilename = filename || path.basename(filePath);
	const url = getUploadAttachmentFileUrl("json", { filename: actualFilename });
	const response = await customFetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/octet-stream" },
		body: fileBuffer
	});
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
	}
	const result = await response.json();
	return result;
}

//#endregion
//#region src/attachment/upload-local-file-handler.ts
const uploadFileHandler = async (args) => {
	const result = await uploadLocalFileToRedmine(args.pathParams.filePath, args.pathParams.filename);
	return { content: [{
		type: "text",
		text: JSON.stringify({
			success: true,
			token: result.upload.token,
			id: result.upload.id,
			message: `File uploaded successfully. Token: ${result.upload.token}`
		}, null, 2)
	}] };
};

//#endregion
//#region src/attachment/download-as-base64-content-client.ts
async function downloadFileAsBase64FromRedmine(attachmentId, filename) {
	const downloadUrl = getDownloadAttachmentFileUrl(attachmentId, filename);
	const downloadResponse = await customFetch(downloadUrl);
	if (!downloadResponse.ok) throw new Error(`Failed to download file: ${downloadResponse.status} ${downloadResponse.statusText}`);
	const fileBuffer = await downloadResponse.arrayBuffer();
	const base64Content = Buffer.from(fileBuffer).toString("base64");
	return {
		content: base64Content,
		filename
	};
}

//#endregion
//#region src/attachment/download-as-base64-content-handler.ts
const downloadAsBase64ContentHandler = async (args) => {
	const result = await downloadFileAsBase64FromRedmine(args.pathParams.attachmentId, args.pathParams.filename);
	return { content: [{
		type: "text",
		text: JSON.stringify({
			success: true,
			content: result.content,
			filename: result.filename,
			message: `File downloaded successfully as Base64 content.`
		}, null, 2)
	}] };
};

//#endregion
//#region src/attachment/thumbnail-as-base64-content-client.ts
async function downloadThumbnailAsBase64FromRedmine(attachmentId) {
	const downloadUrl = getDownloadThumbnailUrl(attachmentId);
	const downloadResponse = await customFetch(downloadUrl);
	if (!downloadResponse.ok) throw new Error(`Failed to download thumbnail: ${downloadResponse.status} ${downloadResponse.statusText}`);
	const fileBuffer = await downloadResponse.arrayBuffer();
	const base64Content = Buffer.from(fileBuffer).toString("base64");
	return {
		content: base64Content,
		attachmentId
	};
}

//#endregion
//#region src/attachment/thumbnail-as-base64-content-handler.ts
const downloadThumbnailAsBase64ContentHandler = async (args) => {
	const result = await downloadThumbnailAsBase64FromRedmine(args.pathParams.attachmentId);
	return { content: [{
		type: "text",
		text: JSON.stringify({
			success: true,
			content: result.content,
			attachmentId: result.attachmentId,
			message: `Thumbnail downloaded successfully as Base64 content for attachment ${result.attachmentId}`
		}, null, 2)
	}] };
};

//#endregion
//#region src/attachment/upload-base64-content-client.ts
async function uploadBase64ContentToRedmine(content, filename) {
	if (!content) throw new Error("Base64 content is required");
	if (!filename) throw new Error("Filename is required");
	let fileBuffer;
	try {
		fileBuffer = Buffer.from(content, "base64");
	} catch (error) {
		throw new Error(`Invalid Base64 content: ${error}`);
	}
	const url = getUploadAttachmentFileUrl("json", { filename });
	const response = await customFetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/octet-stream" },
		body: fileBuffer
	});
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
	}
	const result = await response.json();
	return result;
}

//#endregion
//#region src/attachment/upload-base64-content-handler.ts
const uploadBase64ContentHandler = async (args) => {
	const result = await uploadBase64ContentToRedmine(args.pathParams.content, args.pathParams.filename);
	return { content: [{
		type: "text",
		text: JSON.stringify({
			success: true,
			token: result.upload.token,
			id: result.upload.id,
			message: `File uploaded successfully from Base64 content. Token: ${result.upload.token}`
		}, null, 2)
	}] };
};

//#endregion
//#region src/schemas/attachment.ts
const uploadLocalFileParams = z.object({
	filePath: z.string().describe("Path to the file to upload"),
	filename: z.string().optional().describe("Optional filename to use in Redmine (defaults to basename of filePath)")
});
const downloadToLocalFileParams = z.object({
	attachmentId: z.number().describe("Redmine attachment ID to download"),
	filename: z.string().describe("Filename of the attachment to download"),
	outputDir: z.string().optional().describe("Optional output directory (defaults to OS temp directory)")
});
const downloadThumbnailToLocalFileParams = z.object({
	attachmentId: z.number().describe("Redmine attachment ID to download thumbnail for"),
	outputDir: z.string().optional().describe("Optional output directory (defaults to OS temp directory)")
});
const uploadBase64ContentParams = z.object({
	content: z.string().describe("Base64 encoded file content"),
	filename: z.string().describe("Filename to use in Redmine")
});
const downloadAsBase64ContentParams = z.object({
	attachmentId: z.number().describe("Redmine attachment ID to download"),
	filename: z.string().describe("Filename of the attachment to download")
});
const downloadThumbnailAsBase64ContentParams = z.object({ attachmentId: z.number().describe("Redmine attachment ID to download thumbnail for") });

//#endregion
//#region src/server.ts
var ToolType = /* @__PURE__ */ function(ToolType$1) {
	ToolType$1["READ_ONLY"] = "read_only";
	ToolType$1["WRITE"] = "write";
	return ToolType$1;
}(ToolType || {});
const server = new McpServer({
	name: "redmineAPIServer",
	version: package_default.version
});
const registeredTools = /* @__PURE__ */ new Map();
/**
* Helper function to conditionally register tools based on read-only mode
*/
const registerTool = (toolName, description$1, toolType, schemas, handler) => {
	registeredTools.set(toolName, toolType);
	if (config.readOnlyMode && toolType === ToolType.WRITE) return;
	server.tool(toolName, description$1, schemas, handler);
};
const logServerMode = () => {
	const readOnlyCount = Array.from(registeredTools.values()).filter((t) => t === ToolType.READ_ONLY).length;
	const writeCount = Array.from(registeredTools.values()).filter((t) => t === ToolType.WRITE).length;
	if (config.readOnlyMode) {
		console.error("Starting Redmine MCP Server in READ-ONLY mode");
		console.error(`Available tools: ${readOnlyCount} read-only operations`);
		console.error(`Disabled tools: ${writeCount} write operations`);
	} else {
		console.error("Starting Redmine MCP Server in FULL mode");
		console.error(`Available tools: ${readOnlyCount + writeCount} operations`);
	}
	const disabledFeatures = Object.entries(config.features).filter(([, enabled]) => !enabled).map(([name$1]) => name$1);
	if (disabledFeatures.length > 0) console.error(`Disabled features: ${disabledFeatures.join(", ")}`);
};
registerTool("getIssues", "List issues", ToolType.READ_ONLY, {
	pathParams: getIssuesParams,
	queryParams: getIssuesQueryParams
}, getIssuesHandler);
registerTool("createIssue", "Create issue", ToolType.WRITE, {
	pathParams: createIssueParams,
	bodyParams: createIssueBody
}, createIssueHandler);
registerTool("getIssue", "Show issue", ToolType.READ_ONLY, {
	pathParams: getIssueParams,
	queryParams: getIssueQueryParams
}, getIssueHandler);
registerTool("updateIssue", "Update issue", ToolType.WRITE, {
	pathParams: updateIssueParams,
	bodyParams: updateIssueBody
}, updateIssueHandler);
registerTool("deleteIssue", "Delete issue", ToolType.WRITE, { pathParams: deleteIssueParams }, deleteIssueHandler);
if (config.features.watchers) {
	registerTool("addWatcher", "Add watcher", ToolType.WRITE, {
		pathParams: addWatcherParams,
		bodyParams: addWatcherBody
	}, addWatcherHandler);
	registerTool("removeWatcher", "Remove watcher", ToolType.WRITE, { pathParams: removeWatcherParams }, removeWatcherHandler);
}
if (config.features.projects) registerTool("getProjects", "List projects", ToolType.READ_ONLY, {
	pathParams: getProjectsParams,
	queryParams: getProjectsQueryParams
}, getProjectsHandler);
if (config.features.projects) {
	registerTool("createProject", "Create project", ToolType.WRITE, {
		pathParams: createProjectParams,
		bodyParams: createProjectBody
	}, createProjectHandler);
	registerTool("getProject", "Show project", ToolType.READ_ONLY, {
		pathParams: getProjectParams,
		queryParams: getProjectQueryParams
	}, getProjectHandler);
	registerTool("updateProject", "Update project", ToolType.WRITE, {
		pathParams: updateProjectParams,
		bodyParams: updateProjectBody
	}, updateProjectHandler);
	registerTool("deleteProject", "Delete project", ToolType.WRITE, { pathParams: deleteProjectParams }, deleteProjectHandler);
	registerTool("archiveProject", "Archive project", ToolType.WRITE, { pathParams: archiveProjectParams }, archiveProjectHandler);
	registerTool("unarchiveProject", "Unarchive project", ToolType.WRITE, { pathParams: unarchiveProjectParams }, unarchiveProjectHandler);
}
if (config.features.memberships) {
	registerTool("getMemberships", "List memberships", ToolType.READ_ONLY, {
		pathParams: getMembershipsParams,
		queryParams: getMembershipsQueryParams
	}, getMembershipsHandler);
	registerTool("createMembership", "Create membership", ToolType.WRITE, {
		pathParams: createMembershipParams,
		bodyParams: createMembershipBody
	}, createMembershipHandler);
	registerTool("getMembership", "Show membership", ToolType.READ_ONLY, { pathParams: getMembershipParams }, getMembershipHandler);
	registerTool("updateMembership", "Update membership", ToolType.WRITE, {
		pathParams: updateMembershipParams,
		bodyParams: updateMembershipBody
	}, updateMembershipHandler);
	registerTool("deleteMembership", "Delete membership", ToolType.WRITE, { pathParams: deleteMembershipParams }, deleteMembershipHandler);
}
if (config.features.projects) {
	registerTool("closeProject", "Close project", ToolType.WRITE, { pathParams: closeProjectParams }, closeProjectHandler);
	registerTool("reopenProject", "Reopen project", ToolType.WRITE, { pathParams: reopenProjectParams }, reopenProjectHandler);
}
if (config.features.users) {
	registerTool("getUsers", "List users", ToolType.READ_ONLY, {
		pathParams: getUsersParams,
		queryParams: getUsersQueryParams
	}, getUsersHandler);
	registerTool("createUser", "Create user", ToolType.WRITE, {
		pathParams: createUserParams,
		bodyParams: createUserBody
	}, createUserHandler);
	registerTool("getUser", "Show user", ToolType.READ_ONLY, {
		pathParams: getUserParams,
		queryParams: getUserQueryParams
	}, getUserHandler);
	registerTool("updateUser", "Update user", ToolType.WRITE, {
		pathParams: updateUserParams,
		bodyParams: updateUserBody
	}, updateUserHandler);
	registerTool("deleteUser", "Delete user", ToolType.WRITE, { pathParams: deleteUserParams }, deleteUserHandler);
	registerTool("getCurrentUser", "Show current user", ToolType.READ_ONLY, {
		pathParams: getCurrentUserParams,
		queryParams: getCurrentUserQueryParams
	}, getCurrentUserHandler);
}
if (config.features.timeEntries) {
	registerTool("getTimeEntries", "List time entries", ToolType.READ_ONLY, {
		pathParams: getTimeEntriesParams,
		queryParams: getTimeEntriesQueryParams
	}, getTimeEntriesHandler);
	registerTool("createTimeEntry", "Create time entry", ToolType.WRITE, {
		pathParams: createTimeEntryParams,
		bodyParams: createTimeEntryBody
	}, createTimeEntryHandler);
	registerTool("getTimeEntry", "Show time entry", ToolType.READ_ONLY, { pathParams: getTimeEntryParams }, getTimeEntryHandler);
	registerTool("updateTimeEntry", "Update time entry", ToolType.WRITE, {
		pathParams: updateTimeEntryParams,
		bodyParams: updateTimeEntryBody
	}, updateTimeEntryHandler);
	registerTool("deleteTimeEntry", "Delete time entry", ToolType.WRITE, { pathParams: deleteTimeEntryParams }, deleteTimeEntryHandler);
}
if (config.features.news) {
	registerTool("getNewsList", "List news", ToolType.READ_ONLY, {
		pathParams: getNewsListParams,
		queryParams: getNewsListQueryParams
	}, getNewsListHandler);
	registerTool("getNews", "Show news", ToolType.READ_ONLY, {
		pathParams: getNewsParams,
		queryParams: getNewsQueryParams
	}, getNewsHandler);
	registerTool("updateNews", "Update news", ToolType.WRITE, {
		pathParams: updateNewsParams,
		bodyParams: updateNewsBody
	}, updateNewsHandler);
	registerTool("deleteNews", "Delete news", ToolType.WRITE, { pathParams: deleteNewsParams }, deleteNewsHandler);
	registerTool("getNewsListByProject", "List news by project", ToolType.READ_ONLY, {
		pathParams: getNewsListByProjectParams,
		queryParams: getNewsListByProjectQueryParams
	}, getNewsListByProjectHandler);
	registerTool("createNews", "Create news", ToolType.WRITE, {
		pathParams: createNewsParams,
		bodyParams: createNewsBody
	}, createNewsHandler);
}
if (config.features.relations) {
	registerTool("getIssueRelations", "List issue relations", ToolType.READ_ONLY, { pathParams: getIssueRelationsParams }, getIssueRelationsHandler);
	registerTool("createIssueRelation", "Create issue relation", ToolType.WRITE, {
		pathParams: createIssueRelationParams,
		bodyParams: createIssueRelationBody
	}, createIssueRelationHandler);
	registerTool("getIssueRelation", "Show issue relation", ToolType.READ_ONLY, { pathParams: getIssueRelationParams }, getIssueRelationHandler);
	registerTool("deleteIssueRelation", "Delete issue relation", ToolType.WRITE, { pathParams: deleteIssueRelationParams }, deleteIssueRelationHandler);
}
if (config.features.versions) {
	registerTool("getVersionsByProject", "List versions by project", ToolType.READ_ONLY, {
		pathParams: getVersionsByProjectParams,
		queryParams: getVersionsByProjectQueryParams
	}, getVersionsByProjectHandler);
	registerTool("createVersion", "Create version", ToolType.WRITE, {
		pathParams: createVersionParams,
		bodyParams: createVersionBody
	}, createVersionHandler);
	registerTool("getVersions", "Show version", ToolType.READ_ONLY, { pathParams: getVersionsParams }, getVersionsHandler);
	registerTool("updateVersion", "Update version", ToolType.WRITE, {
		pathParams: updateVersionParams,
		bodyParams: updateVersionBody
	}, updateVersionHandler);
	registerTool("deleteVersion", "Delete version", ToolType.WRITE, { pathParams: deleteVersionParams }, deleteVersionHandler);
}
if (config.features.wiki) {
	registerTool("getWikiPages", "List wiki pages", ToolType.READ_ONLY, { pathParams: getWikiPagesParams }, getWikiPagesHandler);
	registerTool("getWikiPage", "Show wiki page", ToolType.READ_ONLY, {
		pathParams: getWikiPageParams,
		queryParams: getWikiPageQueryParams
	}, getWikiPageHandler);
	registerTool("updateWikiPage", "Create or update wiki page", ToolType.WRITE, {
		pathParams: updateWikiPageParams,
		bodyParams: updateWikiPageBody
	}, updateWikiPageHandler);
	registerTool("deleteWikiPage", "Delete wiki page", ToolType.WRITE, { pathParams: deleteWikiPageParams }, deleteWikiPageHandler);
	registerTool("getWikiPageByVersion", "Show wiki page by specific version", ToolType.READ_ONLY, {
		pathParams: getWikiPageByVersionParams,
		queryParams: getWikiPageByVersionQueryParams
	}, getWikiPageByVersionHandler);
}
registerTool("getQueries", "List queries", ToolType.READ_ONLY, {
	pathParams: getQueriesParams,
	queryParams: getQueriesQueryParams
}, getQueriesHandler);
if (config.features.attachments) {
	registerTool("getAttachment", "Show attachment", ToolType.READ_ONLY, { pathParams: getAttachmentParams }, getAttachmentHandler);
	registerTool("updateAttachment", "Update attachment", ToolType.WRITE, {
		pathParams: updateAttachmentParams,
		bodyParams: updateAttachmentBody
	}, updateAttachmentHandler);
	registerTool("deleteAttachment", "Delete attachment", ToolType.WRITE, { pathParams: deleteAttachmentParams }, deleteAttachmentHandler);
}
registerTool("getIssueStatuses", "List issue statuses", ToolType.READ_ONLY, { pathParams: getIssueStatusesParams }, getIssueStatusesHandler);
registerTool("getTrackers", "List trackers", ToolType.READ_ONLY, { pathParams: getTrackersParams }, getTrackersHandler);
registerTool("getIssueCategories", "List issue categories", ToolType.READ_ONLY, {
	pathParams: getIssueCategoriesParams,
	queryParams: getIssueCategoriesQueryParams
}, getIssueCategoriesHandler);
registerTool("createIssueCategory", "Create issue category", ToolType.WRITE, {
	pathParams: createIssueCategoryParams,
	bodyParams: createIssueCategoryBody
}, createIssueCategoryHandler);
registerTool("getIssuePriorities", "List issue priorities", ToolType.READ_ONLY, { pathParams: getIssuePrioritiesParams }, getIssuePrioritiesHandler);
if (config.features.timeEntries) registerTool("getTimeEntryActivities", "List time entry activities", ToolType.READ_ONLY, { pathParams: getTimeEntryActivitiesParams }, getTimeEntryActivitiesHandler);
registerTool("getDocumentCategories", "List document categories", ToolType.READ_ONLY, { pathParams: getDocumentCategoriesParams }, getDocumentCategoriesHandler);
registerTool("getIssueCategory", "Show issue category", ToolType.READ_ONLY, { pathParams: getIssueCategoryParams }, getIssueCategoryHandler);
registerTool("updateIssueCategory", "Update issue category", ToolType.WRITE, {
	pathParams: updateIssueCategoryParams,
	bodyParams: updateIssueCategoryBody
}, updateIssueCategoryHandler);
registerTool("deleteIssueCategory", "Delete issue category", ToolType.WRITE, {
	pathParams: deleteIssueCategoryParams,
	queryParams: deleteIssueCategoryQueryParams
}, deleteIssueCategoryHandler);
registerTool("getRoles", "List roles", ToolType.READ_ONLY, { pathParams: getRolesParams }, getRolesHandler);
registerTool("getRole", "Show role", ToolType.READ_ONLY, { pathParams: getRoleParams }, getRoleHandler);
if (config.features.groups) {
	registerTool("getGroups", "List groups", ToolType.READ_ONLY, { pathParams: getGroupsParams }, getGroupsHandler);
	registerTool("createGroup", "Create group", ToolType.WRITE, {
		pathParams: createGroupParams,
		bodyParams: createGroupBody
	}, createGroupHandler);
	registerTool("getGroup", "Show group", ToolType.READ_ONLY, {
		pathParams: getGroupParams,
		queryParams: getGroupQueryParams
	}, getGroupHandler);
	registerTool("updateGroup", "Update group", ToolType.WRITE, {
		pathParams: updateGroupParams,
		bodyParams: updateGroupBody
	}, updateGroupHandler);
	registerTool("deleteGroup", "Delete group", ToolType.WRITE, { pathParams: deleteGroupParams }, deleteGroupHandler);
	registerTool("addUserToGroup", "Add user to group", ToolType.WRITE, {
		pathParams: addUserToGroupParams,
		bodyParams: addUserToGroupBody
	}, addUserToGroupHandler);
	registerTool("removeUserFromGroup", "Remove user from group", ToolType.WRITE, { pathParams: removeUserFromGroupParams }, removeUserFromGroupHandler);
}
registerTool("getCustomFields", "List custom fields", ToolType.READ_ONLY, { pathParams: getCustomFieldsParams }, getCustomFieldsHandler);
registerTool("search", "Search", ToolType.READ_ONLY, {
	pathParams: searchParams,
	queryParams: searchQueryParams
}, searchHandler);
if (config.features.files) {
	registerTool("getFiles", "List files", ToolType.READ_ONLY, { pathParams: getFilesParams }, getFilesHandler);
	registerTool("createFile", "Create file", ToolType.WRITE, {
		pathParams: createFileParams,
		bodyParams: createFileBody
	}, createFileHandler);
}
registerTool("getMyAccount", "Show my account", ToolType.READ_ONLY, { pathParams: getMyAccountParams }, getMyAccountHandler);
registerTool("updateMyAccount", "Update my account", ToolType.WRITE, {
	pathParams: updateMyAccountParams,
	bodyParams: updateMyAccountBody
}, updateMyAccountHandler);
registerTool("updateJournal", "Update journal", ToolType.WRITE, {
	pathParams: updateJournalParams,
	bodyParams: updateJournalBody
}, updateJournalHandler);
registerTool("addRelatedIssue", "Add related issue", ToolType.WRITE, {
	pathParams: addRelatedIssueParams,
	bodyParams: addRelatedIssueBody
}, addRelatedIssueHandler);
registerTool("removeRelatedIssue", "Remove related issue", ToolType.WRITE, { pathParams: removeRelatedIssueParams }, removeRelatedIssueHandler);
if (config.features.attachments) {
	registerTool("uploadAttachmentFromLocalFile", "Upload attachment file from local file system to Redmine and get upload token", ToolType.WRITE, { pathParams: uploadLocalFileParams }, uploadFileHandler);
	registerTool("downloadAttachmentToLocalFile", "Download attachment file from Redmine to local file system", ToolType.READ_ONLY, { pathParams: downloadToLocalFileParams }, downloadFileHandler);
	registerTool("downloadThumbnailToLocalFile", "Download thumbnail from Redmine to local file system", ToolType.READ_ONLY, { pathParams: downloadThumbnailToLocalFileParams }, downloadThumbnailHandler);
	registerTool("uploadAttachmentFromBase64Content", "Upload attachment file from Base64 encoded content to Redmine and get upload token", ToolType.WRITE, { pathParams: uploadBase64ContentParams }, uploadBase64ContentHandler);
	registerTool("downloadAttachmentAsBase64Content", "Download attachment file from Redmine as Base64 encoded content", ToolType.READ_ONLY, { pathParams: downloadAsBase64ContentParams }, downloadAsBase64ContentHandler);
	registerTool("downloadThumbnailAsBase64Content", "Download thumbnail from Redmine as Base64 encoded content", ToolType.READ_ONLY, { pathParams: downloadThumbnailAsBase64ContentParams }, downloadThumbnailAsBase64ContentHandler);
}
logServerMode();
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
	console.error("MCP server running on stdio");
}).catch(console.error);

//#endregion