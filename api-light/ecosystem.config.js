module.exports = {
  apps: [{
    name: "estate-whatsapp-api",
    script: "./src/server.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    // PM2 auto-restarts on crash
    max_memory_restart: "1G",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log"
  }]
}
