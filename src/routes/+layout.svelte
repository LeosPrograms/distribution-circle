<script lang="ts">
	import { onMount } from 'svelte'
	import 'bootstrap/dist/css/bootstrap.min.css'

	interface Props {
		children?: import('svelte').Snippet
	}

	let { children }: Props = $props()

	onMount(async () => {
		await import('bootstrap/js/dist/collapse')
		await import('bootstrap/js/dist/dropdown')
	})
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
	<!-- <div class="container"> -->
	<div>
		<a class="navbar-brand" href="/">Transfer Plan</a>
		<button
			class="navbar-toggler"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#navbarMain"
			aria-controls="navbarMain"
			aria-expanded="false"
			aria-label="Toggle navigation"
		>
			<span class="navbar-toggler-icon"></span>
		</button>
		<div class="collapse navbar-collapse" id="navbarMain">
			<ul class="navbar-nav me-5">
				<li class="nav-item"><a class="nav-link active" aria-current="page" href="/">Home</a></li>
				<li class="nav-item"><a class="nav-link" href="/info">Info</a></li>
			</ul>
		</div>
	</div>
</nav>

<main>
	{@render children?.()}
</main>

<style global>
	* {
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.navbar-brand {
		font-size: 1.25rem;
		margin-left: 0.5rem;
	}

	nav {
		display: none;
	}
</style>
