const { execSync } = require('child_process');

function killPort3000() {
  try {
    console.log('Checking port 3000...');
    if (process.platform === 'win32') {
      // Windows command to find process on port 3000
      let stdout;
      try {
        stdout = execSync('netstat -ano').toString();
      } catch (err) {
        return;
      }
      
      const lines = stdout.split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Protocol LocalAddress ForeignAddress State PID
        if (parts.length >= 5) {
          const localAddress = parts[1];
          const pid = parts[parts.length - 1];
          if (localAddress.includes(':3000') && pid && pid !== '0') {
            pids.add(pid);
          }
        }
      }
      
      if (pids.size > 0) {
        for (const pid of pids) {
          try {
            console.log(`Killing process ${pid} occupying port 3000...`);
            execSync(`taskkill /F /PID ${pid}`);
          } catch (err) {
            console.error(`Failed to kill process ${pid}:`, err.message);
          }
        }
      } else {
        console.log('Port 3000 is clean.');
      }
    } else {
      // macOS / Linux
      try {
        console.log('Killing any processes on port 3000...');
        execSync('lsof -t -i:3000 | xargs kill -9');
      } catch (err) {
        // Safe to ignore if no process is running
      }
    }
  } catch (error) {
    console.error('Error occurred while clearing port 3000:', error.message);
  }
}

killPort3000();
