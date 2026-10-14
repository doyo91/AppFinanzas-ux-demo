<script lang="ts">
	let { name, size = 20 }: { name: string; size?: number } = $props();
	const paths: Record<string, string> = {
		home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
		movement: 'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',
		chart: 'M4 20V10m8 10V4m8 16v-7',
		person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
		plus: 'M12 5v14M5 12h14',
		arrow: 'M5 12h14m-6-6 6 6-6 6',
		up: 'M7 17 17 7M7 7h10v10',
		down: 'M7 7 17 17M7 17h10V7',
		search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
		wallet: 'M3 7V5a2 2 0 0 1 2-2h14v4M3 7h17v14H3zM15 12h5v5h-5z',
		shield: 'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7zM8 12l3 3 5-6',
		reset: 'M3 10a9 9 0 1 1 2 9M3 3v7h7',
		close: 'M6 6l12 12M6 18 18 6',
		more: 'M5 5h3v3H5zM16 5h3v3h-3zM5 16h3v3H5zM16 16h3v3h-3z',
		calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16',
		check: 'M5 12l4 4L19 6',
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"><path d={paths[name] ?? paths.wallet} /></svg
>
