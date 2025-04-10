const socket = io();
socket.on("status", (data) => {
  console.log("Live status:", data);
});

fetch("http://localhost:5000/build-history")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("history");
    data.builds.forEach(build => {
      const li = document.createElement("li");
      li.textContent = `Build #${build.number} - ${build.result} - ${new Date(build.timestamp).toLocaleString()}`;
      list.appendChild(li);
    });
  });
