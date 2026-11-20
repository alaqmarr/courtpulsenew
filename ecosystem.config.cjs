module.exports = {
  apps: [
    {
      name: "courtpulse",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3012",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "750M",
      env: {
        NODE_ENV: "production",
        PORT: 3012,
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
