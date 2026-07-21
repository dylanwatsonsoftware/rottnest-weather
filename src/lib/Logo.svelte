<script>
    let { size = 32, class: className = '' } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    class={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Stylised Rottnest Island outline"
    role="img"
>
    <path
        class="rottnest-reef"
        d="M9 38C16 43 25 45 35 43C44 41.2 50.5 37.5 56 32"
        stroke="currentColor"
        stroke-width="4"
        stroke-linecap="round"
        opacity="0.42"
    />
    <path
        class="rottnest-outline"
        d="M7.5 34.5C10.8 29 16.2 25.8 22.5 23.7C27.2 22.1 31.9 18.3 37.8 19.6C42.2 20.6 43.9 23.7 48.1 23.9C52.5 24.1 57.1 25.6 58.5 30C59.7 33.8 56.2 37.8 51.2 38.3C46.2 38.8 43.9 42.5 38.9 41.9C34.1 41.3 29.5 43.5 24.8 42.4C18.3 40.8 11.9 41.4 7.5 34.5Z"
        fill="currentColor"
    />
    <circle
        class="rottnest-location"
        cx="42.5"
        cy="30.5"
        r="4.2"
        fill="white"
        opacity="0.96"
    />
    <circle
        cx="42.5"
        cy="30.5"
        r="1.9"
        fill="currentColor"
    />
</svg>
