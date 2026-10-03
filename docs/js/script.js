    let currentSummary = "";
    let selectedPersonIndex = -1;
    let currentResults = [];
    const STORAGE_KEY = 'billSplitterState';

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function writeClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }
        return fallbackCopy(text);
    }

    function fallbackCopy(text) {
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            ta.remove();
            if (ok) resolve(); else reject(new Error('copy failed'));
        });
    }

    function saveState() {
        try {
            const rows = [...document.querySelectorAll('#itemContainer .row')].map(row => ({
                name: row.querySelector('.name-in').value,
                price: row.querySelector('.price-in').value
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                rows,
                svc: document.getElementById('svcCheck').checked,
                vat: document.getElementById('vatCheck').checked,
                extra: document.getElementById('extraFee').value,
                discount: document.getElementById('totalDiscount').value
            }));
        } catch (e) { /* storage unavailable */ }
    }

    function loadState() {
        let state = null;
        try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { state = null; }
        if (!state || !Array.isArray(state.rows) || state.rows.length === 0) return;

        document.getElementById('itemContainer').innerHTML = '';
        state.rows.forEach(r => addItem(r.name, r.price));
        document.getElementById('svcCheck').checked = !!state.svc;
        document.getElementById('vatCheck').checked = !!state.vat;
        document.getElementById('extraFee').value = state.extra || '';
        document.getElementById('totalDiscount').value = state.discount || '';
        update();
    }

    function parseMath(str) {
        if (!str) return 0;
        try {
            const sanitized = str.replace(/[^-()\d/*+.]/g, '');
            return new Function(`return (${sanitized})`)() || 0;
        } catch (e) { return 0; }
    }

    function toggleSelection(index) {
        if (selectedPersonIndex === index) {
            selectedPersonIndex = -1;
        } else {
            selectedPersonIndex = index;
        }
        update();
    }

    function addItem(name = '', price = '') {
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `<div class="input-group" style="flex: 1.5;">
                            <i class="fa-solid fa-user"></i>
                            <input type="text" placeholder="ชื่อ" class="name-in">
                         </div>
                         <div class="input-group" style="flex: 1;">
                            <i class="fa-solid fa-baht-sign"></i>
                            <input type="text" placeholder="ราคา" class="price-in">
                         </div>
                         <button class="btn" style="width: auto; padding: 12px; background: #ffe5e5; color: #ff3b30;" onclick="removeRow(this)"><i class="fa-solid fa-trash-can"></i></button>`;
        div.querySelector('.name-in').value = name;
        div.querySelector('.price-in').value = price;
        document.getElementById('itemContainer').appendChild(div);
        saveState();
    }

    function removeRow(btn) {
        btn.parentElement.remove();
        selectedPersonIndex = -1;
        update();
    }

    function copyIndividual(btn, index) {
        const person = currentResults[index];
        if (!person) return;
        writeClipboard(`${person.name}: ${person.amount.toLocaleString()}.-`).then(() => {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 1500);
        }).catch(() => alert('คัดลอกไม่สำเร็จ ลองคัดลอกเองนะ'));
    }

    function update() {
        saveState();
        const names = document.querySelectorAll('.name-in');
        const priceInputs = document.querySelectorAll('.price-in');
        const hasSvc = document.getElementById('svcCheck').checked;
        const hasVat = document.getElementById('vatCheck').checked;
        const extra = parseMath(document.getElementById('extraFee').value);
        const discount = parseMath(document.getElementById('totalDiscount').value);

        let data = [];
        let totalFoodTaxed = 0;

        for(let i=0; i<priceInputs.length; i++) {
            let rawPrice = parseMath(priceInputs[i].value);
            if(rawPrice === 0 && !names[i].value) continue;
            
            let taxedPrice = rawPrice;
            if(hasSvc) taxedPrice *= 1.10;
            if(hasVat) taxedPrice *= 1.07;

            data.push({ name: names[i].value || `รายการที่ ${i+1}`, baseTaxed: taxedPrice });
            totalFoodTaxed += taxedPrice;
        }

        if(data.length === 0) {
            document.getElementById('individualResults').style.display = 'none';
            document.getElementById('totalExact').innerText = "0.00";
            document.getElementById('totalRounded').innerText = "0";
            document.getElementById('totalAfterDeduction').innerText = "0";
            return;
        }

        let extraPerPerson = extra / data.length;
        let grandTotalExact = 0;
        let grandTotalRounded = 0;
        let resultHtml = "";
        let copyText = "🧾 สรุปยอดค่าอาหาร\n------------------\n";

        let personNetAmounts = [];
        currentResults = [];
        data.forEach(item => {
            let ratio = totalFoodTaxed > 0 ? (item.baseTaxed / totalFoodTaxed) : 0;
            let exact = (item.baseTaxed + extraPerPerson) - (discount * ratio);
            exact = Math.max(0, exact);
            let rounded = Math.ceil(exact);
            grandTotalExact += exact;
            grandTotalRounded += rounded;
            personNetAmounts.push(rounded);
            currentResults.push({ name: item.name, amount: rounded });
            
            copyText += `${item.name}: ${rounded.toLocaleString()}.- \n`;
        });

        let selectedPersonAmount = selectedPersonIndex !== -1 ? personNetAmounts[selectedPersonIndex] : 0;

        data.forEach((item, index) => {
            const isSelected = index === selectedPersonIndex;
            resultHtml += `
            <div class="result-item" style="${isSelected ? 'background: #e1f5fe; border-radius: 8px;' : ''}">
                <span style="font-size:14px; cursor:pointer;" onclick="toggleSelection(${index})">
                    <i class="fa-solid fa-user" style="color:${isSelected ? 'var(--primary)' : '#86868b'}; margin-right:5px;"></i> ${escapeHtml(item.name)}
                </span>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 11px; color: #86868b;">${((item.baseTaxed + extraPerPerson) - (discount * (totalFoodTaxed > 0 ? (item.baseTaxed / totalFoodTaxed) : 0))).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="price-final">${personNetAmounts[index].toLocaleString()}.-</span>
                    <button class="btn" style="padding: 4px 8px; font-size: 10px; width: auto;" onclick="copyIndividual(this, ${index})" title="คัดลอกยอดของ ${escapeHtml(item.name)}">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>`;
        });

        currentSummary = copyText + `------------------\nยอดรวม: ${grandTotalRounded.toLocaleString()} บาท`;

        document.getElementById('resultList').innerHTML = resultHtml;
        document.getElementById('individualResults').style.display = 'block';
        document.getElementById('totalExact').innerText = grandTotalExact.toLocaleString(undefined, {minimumFractionDigits: 2});
        document.getElementById('totalRounded').innerText = grandTotalRounded.toLocaleString();
        
        const finalNet = grandTotalExact - selectedPersonAmount;
        document.getElementById('totalAfterDeduction').innerText = finalNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    function copyToClipboard() {
        writeClipboard(currentSummary).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalContent = btn.innerHTML;
            btn.innerHTML = "<i class='fa-solid fa-check'></i> คัดลอกแล้ว!";
            btn.style.background = "#1d1d1f";
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = "var(--success)";
            }, 2000);
        }).catch(() => alert('คัดลอกไม่สำเร็จ ลองคัดลอกเองนะ'));
    }

    function resetForm() {
        if(confirm("ล้างข้อมูลราคาและยอดทั้งหมด?")) {
            document.querySelectorAll('.price-in').forEach(input => input.value = '');
            document.getElementById('extraFee').value = '';
            document.getElementById('totalDiscount').value = '';
            selectedPersonIndex = -1;
            update();
        }
    }

    loadState();
