UI.onPageReady(() => {
  const client = new SplitsIOApiClient();

  const testGetBtn = document.getElementById("testGet");
  UI.addEvent(testGetBtn, "click", async () => {
    const runData = await client.run.get("9okq");
    const fetchedRun = SplitsIORun.from(runData.run);
    window.run = TimeItSpeedRun.from(fetchedRun);
  });
});
