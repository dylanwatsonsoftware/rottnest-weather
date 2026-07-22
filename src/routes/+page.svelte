<script>
    import App from '../App.svelte';

    let { data } = $props();
</script>

<App initialData={data.appData} initialUrlState={data.urlState} initialUrl={data.socialMeta.url} />
