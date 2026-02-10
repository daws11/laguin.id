const http = require('http');
const nodemailer = require('nodemailer');
const url = require('url');

// Konfigurasi Server
const PORT = 3000;

// HTML Template untuk Interface Debugger
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMTP Debugger Tool v4 (Envelope Fix)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .log-entry { font-family: monospace; margin-bottom: 4px; border-bottom: 1px solid #333; padding-bottom: 2px; word-break: break-all; }
        .log-error { color: #ef4444; }
        .log-success { color: #22c55e; }
        .log-info { color: #3b82f6; }
        .log-warn { color: #eab308; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
    <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Kolom Kiri: Form Konfigurasi -->
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 class="text-xl font-bold mb-4 text-blue-400 border-b border-gray-700 pb-2">Konfigurasi SMTP</h2>
            <form id="smtpForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-400">SMTP Host</label>
                    <input type="text" name="host" value="smtp.emailit.com" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-400">Port</label>
                        <input type="number" name="port" value="587" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-400">Secure (TLS)</label>
                        <select name="secure" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                            <option value="false">False (STARTTLS - Port 587)</option>
                            <option value="true">True (SSL - Port 465)</option>
                        </select>
                    </div>
                </div>
                
                <div class="bg-gray-700 p-3 rounded border border-gray-600">
                    <h3 class="text-sm font-bold text-gray-300 mb-2">Autentikasi</h3>
                    <div class="mb-2">
                        <label class="block text-xs font-medium mb-1 text-gray-400">SMTP Username</label>
                        <input type="text" name="user" value="emailit" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                        <p class="text-[10px] text-gray-400 mt-1">Default: 'emailit'. Jika gagal, coba ganti dengan email Anda.</p>
                    </div>
                    <div>
                        <label class="block text-xs font-medium mb-1 text-gray-400">SMTP Password (API Key)</label>
                        <input type="password" name="pass" placeholder="secret_..." class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                    </div>
                </div>
                
                <div class="bg-gray-700 p-3 rounded border border-yellow-600">
                    <h3 class="text-sm font-bold text-yellow-400 mb-2">Pengirim (Sender Identity)</h3>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-xs font-medium mb-1 text-gray-400">Nama Pengirim</label>
                            <input type="text" name="fromName" value="Support Laguin" placeholder="Support" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-yellow-500">
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1 text-gray-400">Email Pengirim</label>
                            <input type="text" name="fromEmail" value="support@laguin.id" placeholder="support@domain.com" class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-yellow-500">
                        </div>
                    </div>
                    
                    <div class="flex items-center mt-3 pt-2 border-t border-gray-600">
                        <input type="checkbox" id="simpleFrom" name="simpleFrom" class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500 focus:ring-2">
                        <label for="simpleFrom" class="ml-2 text-xs text-white font-bold">Kirim sebagai Raw Email saja (Tanpa Nama)</label>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1 ml-6">Memaksa penggunaan format email murni di header.</p>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-400">To Address (Penerima)</label>
                    <input type="email" name="to" placeholder="email.anda@gmail.com" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                </div>

                <button type="submit" id="btnTest" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition duration-200 mt-4">
                    Test Koneksi & Kirim
                </button>
            </form>
        </div>

        <!-- Kolom Kanan: Log Output -->
        <div class="bg-black p-6 rounded-lg shadow-lg border border-gray-800 flex flex-col h-full">
            <div class="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h2 class="text-xl font-bold text-green-400">Debug Console</h2>
                <button onclick="clearLog()" class="text-xs text-gray-500 hover:text-white">Clear</button>
            </div>
            <div id="consoleOutput" class="flex-1 overflow-y-auto font-mono text-sm text-gray-300 max-h-[600px] text-xs">
                <div class="text-gray-500 italic">Menunggu input...</div>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('smtpForm');
        const output = document.getElementById('consoleOutput');
        const btn = document.getElementById('btnTest');

        function log(msg, type = 'info') {
            const div = document.createElement('div');
            div.className = \`log-entry log-\${type}\`;
            const time = new Date().toLocaleTimeString();
            
            // Escape HTML characters agar <email> terlihat di log
            const safeMsg = msg
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");

            div.innerHTML = \`<span class="text-gray-600">[\${time}]</span> \${safeMsg}\`;
            output.appendChild(div);
            output.scrollTop = output.scrollHeight;
        }

        function clearLog() {
            output.innerHTML = '';
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value.trim(); 
            }
            
            // Handle checkbox manually
            data.simpleFrom = document.getElementById('simpleFrom').checked;

            if(!data.pass || !data.to || !data.fromEmail) {
                log('Mohon lengkapi Password, Email Pengirim, dan Penerima!', 'error');
                return;
            }

            log('--- MEMULAI DIAGNOSA V4 (Strict Envelope) ---', 'info');
            log(\`Target: \${data.host}:\${data.port}\`, 'info');
            
            // Preview format
            if (data.simpleFrom) {
                log(\`Mode: Raw Email Only\`, 'info');
                log(\`Sender: \${data.fromEmail}\`, 'warn');
            } else {
                log(\`Mode: Full Name + Email\`, 'info');
                log(\`Sender: "\${data.fromName}" <\${data.fromEmail}>\`, 'warn');
            }

            btn.disabled = true;
            btn.textContent = 'Mendiagnosa...';
            btn.classList.add('opacity-50');

            try {
                const response = await fetch('/test-smtp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    log('✅ BERHASIL DIKIRIM!', 'success');
                    log(\`Server Response: \${result.info.response}\`, 'success');
                    alert('Sukses! Masalah teratasi.');
                } else {
                    log('❌ PENGIRIMAN GAGAL', 'error');
                    log(\`Error Msg: \${result.error.message}\`, 'error');
                    
                    if (result.error.response) {
                        log(\`SMTP Reply: \${result.error.response}\`, 'error');
                    }

                    if (result.error.response && result.error.response.includes('530')) {
                        log('💡 KESIMPULAN AKHIR:', 'warn');
                        log('Jika Anda sudah membuat API Key Baru dan Domain sudah verified, namun tetap error ini:', 'warn');
                        log('Masalahnya 99% pada API Key yang "nyangkut" di state lama.', 'warn');
                        log('Solusi: Hapus API Key lama di dashboard -> Logout EmailIt -> Login lagi -> Buat API Key Baru.', 'warn');
                    }
                }
            } catch (err) {
                log(\`Network/Server Error: \${err.message}\`, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Test Koneksi & Kirim';
                btn.classList.remove('opacity-50');
            }
        });
    </script>
</body>
</html>
`;

// Fungsi Helper untuk menghandle request
const handleRequest = async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlTemplate);
        return;
    }

    if (req.method === 'POST' && req.url === '/test-smtp') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const config = JSON.parse(body);

                const transporter = nodemailer.createTransport({
                    host: config.host,
                    port: parseInt(config.port),
                    secure: config.secure === 'true', 
                    auth: {
                        user: config.user,
                        pass: config.pass
                    },
                    logger: true,
                    debug: true 
                });

                // Logic pemilihan format Sender
                const finalFrom = config.simpleFrom 
                    ? config.fromEmail 
                    : `"${config.fromName}" <${config.fromEmail}>`;

                // FORCE ENVELOPE: Memastikan SMTP Command 'MAIL FROM'
                // menggunakan email bersih, terlepas dari Header 'From'.
                const envelopeOptions = {
                    from: config.fromEmail, // SELALU gunakan raw email untuk envelope
                    to: config.to
                };

                const info = await transporter.sendMail({
                    from: finalFrom,
                    to: config.to,
                    envelope: envelopeOptions, // INI KUNCI PERBAIKANNYA
                    subject: "SMTP Debug Test - " + new Date().toLocaleTimeString(),
                    text: "Test koneksi SMTP berhasil.",
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                            <h2 style="color: #22c55e;">Test Berhasil! ✅</h2>
                            <p>Email dikirim dengan Envelope & Header terpisah.</p>
                            <pre style="background:#eee; padding:10px;">Header From: ${finalFrom.replace(/</g, '&lt;')}</pre>
                            <pre style="background:#eee; padding:10px;">Envelope From: ${config.fromEmail}</pre>
                        </div>
                    `
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, info: info }));

            } catch (error) {
                console.error("SMTP Error:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: {
                        message: error.message,
                        code: error.code,
                        response: error.response,
                    } 
                }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
};

// Start Server
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 SMTP Debugger V4 berjalan!`);
    console.log(`👉 Buka browser Anda di: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});