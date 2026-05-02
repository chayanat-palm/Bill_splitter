    let currentSummary = "";

    function parseMath(str) {
        if (!str) return 0;
        try {
            const sanitized = str.replace(/[^-()\d/*+.]/g, '');
            return new Function(`return (${sanitized})`)() || 0;
        } catch (e) { return 0; }
    }

    function addItem() {
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `<div class="input-group" style="flex: 1.5;">
                            <i class="fa-solid fa-user"></i>
                            <input type="text" placeholder="ชื่อ" class="name-in">
                         </div>
                         <div class="input-group" style="flex: 1;">
                            <i class="fa-solid fa-baht-sign"></i>
                            <input type="text" placeholder="ราคา" class="price-in">
                         </div>`;
        document.getElementById('itemContainer').appendChild(div);
    }

    function update() {
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
            return;
        }

        let extraPerPerson = extra / data.length;
        let grandTotalExact = 0;
        let grandTotalRounded = 0;
        let resultHtml = "";
        let copyText = "🧾 สรุปยอดค่าอาหาร\n------------------\n";

        data.forEach(item => {
            let ratio = totalFoodTaxed > 0 ? (item.baseTaxed / totalFoodTaxed) : 0;
            let exact = (item.baseTaxed + extraPerPerson) - (discount * ratio);
            exact = Math.max(0, exact);
            
            let rounded = Math.ceil(exact);
            grandTotalExact += exact;
            grandTotalRounded += rounded;

            resultHtml += `
            <div class="result-item">
                <span style="font-size:14px;"><i class="fa-solid fa-caret-right" style="color:var(--primary); margin-right:5px;"></i> ${item.name}</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="price-final">${rounded.toLocaleString()}.-</span>
                    <button class="btn" style="padding: 4px 8px; font-size: 10px; width: auto;" onclick="copyIndividual('${item.name}', ${rounded})">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>`;
            
            copyText += `${item.name}: ${rounded.toLocaleString()}.- \n`;
        });

        currentSummary = copyText + `------------------\nยอดรวมสุทธิ: ${grandTotalExact.toLocaleString(undefined, {minimumFractionDigits: 2})} บาท`;

        document.getElementById('resultList').innerHTML = resultHtml;
        document.getElementById('individualResults').style.display = 'block';
        document.getElementById('totalExact').innerText = grandTotalExact.toLocaleString(undefined, {minimumFractionDigits: 2});
        document.getElementById('totalRounded').innerText = grandTotalRounded.toLocaleString();
    }

    function copyIndividual(name, amount) {
        navigator.clipboard.writeText(`${name}: ${amount.toLocaleString()}.-`);
        alert(`คัดลอกยอดของ ${name} เรียบร้อยแล้ว`);
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(currentSummary).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalContent = btn.innerHTML;
            btn.innerHTML = "<i class='fa-solid fa-check'></i> คัดลอกแล้ว!";
            btn.style.background = "#1d1d1f";
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = "var(--success)";
            }, 2000);
        });
    }

    function resetForm() {
        if(confirm("ล้างข้อมูลทั้งหมด?")) location.reload();
    }
