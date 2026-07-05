import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	base: process.env.NODE_ENV === "production" ? "/fwc-playoff/" : "/",
});
