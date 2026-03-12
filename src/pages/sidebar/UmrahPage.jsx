import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { Search, Filter, X, ChevronDown, Printer, Download, RefreshCw } from "lucide-react";
import * as XLSX from 'xlsx';

export default function UmrahPage() {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterColumn, setFilterColumn] = useState("semua");
    const [filterValue, setFilterValue] = useState("");
    const [uniqueValues, setUniqueValues] = useState({});
    const [lastUpdated, setLastUpdated] = useState(null);

    // Kolom yang akan ditampilkan di web - DENGAN NILAI AKHIR (hanya angka)
    const displayColumns = [
        "nama",
        "kj",
        "status usia",
        "masa kerja",
        "sanksi disiplin",
        "ibadah keagamaan",
        "presensi alpha",
        "nilai akhir"  // Kolom nilai akhir - hanya angka
    ];

    // Mapping untuk mencocokkan nama kolom dari CSV (case insensitive)
    const columnMapping = {
        "nama": ["nama", "name", "nama lengkap", "full name"],
        "kj": ["kj", "kelas jabatan", "kelas jabatan atau kj", "jabatan"],
        "status usia": ["status usia", "usia", "umur", "age"],
        "masa kerja": ["masa kerja", "masa_kerja", "lama kerja", "tahun kerja"],
        "sanksi disiplin": ["sanksi disiplin", "sanksi", "disiplin", "sanksi_disiplin"],
        "ibadah keagamaan": ["ibadah keagamaan", "ibadah", "keagamaan", "ibadah_keagamaan"],
        "presensi alpha": ["presensi alpha", "presensi", "alpha", "kehadiran", "presensi_alpha"],
        "nilai akhir": ["nilai akhir", "nilai_akhir", "nilai", "score", "total nilai", "nilai total"]
    };

    const sheetUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSoK2tRSoEtFgLeT4IMJMhpeTROGGucLSNvgPBIlHg-J3cY9XJrd60WMJcsG9Vzs7SyB3LcxEseUvC3/pub?gid=274840739&single=true&output=csv";

    const fetchData = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        
        const url = sheetUrl + "&t=" + new Date().getTime();

        try {
            const res = await fetch(url, { cache: "no-store" });
            const csvText = await res.text();
            
            const result = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            // Filter data untuk hanya mengambil kolom yang diperlukan
            const filteredRows = result.data.map(row => {
                const newRow = {};
                displayColumns.forEach(col => {
                    newRow[col] = getValueFromRow(row, col);
                });
                return newRow;
            });

            setData(filteredRows);
            setFilteredData(filteredRows);
            
            // Hitung nilai unik untuk setiap kolom
            if (filteredRows.length > 0) {
                const uniques = {};
                displayColumns.forEach(col => {
                    const values = [...new Set(filteredRows.map(row => row[col]))].filter(Boolean);
                    uniques[col] = values;
                });
                setUniqueValues(uniques);
            }
            
            setLastUpdated(new Date());
            setLoading(false);
            if (showRefreshing) setRefreshing(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
            if (showRefreshing) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();

        const interval = setInterval(() => fetchData(false), 30000); // refresh tiap 30 detik

        return () => clearInterval(interval);
    }, []);

    // Fungsi untuk refresh manual
    const handleManualRefresh = () => {
        fetchData(true);
    };

    // Fungsi untuk filter dan search
    useEffect(() => {
        let result = [...data];

        // Apply search
        if (searchTerm) {
            result = result.filter(row => {
                return Object.values(row).some(value =>
                    String(value || "").toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Apply column filter
        if (filterColumn !== "semua" && filterValue) {
            result = result.filter(row =>
                String(row[filterColumn] || "").toLowerCase() === filterValue.toLowerCase()
            );
        }

        setFilteredData(result);
    }, [searchTerm, filterColumn, filterValue, data]);

    const clearFilters = () => {
        setSearchTerm("");
        setFilterColumn("semua");
        setFilterValue("");
    };

    const getColumnOptions = () => {
        if (filterColumn === "semua") return [];
        return uniqueValues[filterColumn] || [];
    };

    // Fungsi untuk mendapatkan nilai dari row berdasarkan nama kolom yang diinginkan
    const getValueFromRow = (row, targetColumn) => {
        if (!row) return '-';
        
        const possibleKeys = columnMapping[targetColumn] || [targetColumn];

        for (const key of possibleKeys) {
            // Cari key yang match (case insensitive)
            const foundKey = Object.keys(row).find(
                rowKey => rowKey.toLowerCase() === key.toLowerCase()
            );
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
                let value = row[foundKey];
                
                // Untuk nilai akhir, pastikan hanya angka yang ditampilkan
                if (targetColumn === "nilai akhir") {
                    // Ekstrak hanya angka dari string (misal "85 (Baik)" -> "85")
                    const numericValue = parseFloat(value);
                    if (!isNaN(numericValue)) {
                        return numericValue.toString();
                    }
                }
                
                return value;
            }
        }

        // Jika tidak ditemukan, coba cari partial match
        for (const key of possibleKeys) {
            const foundKey = Object.keys(row).find(
                rowKey => rowKey.toLowerCase().includes(key.toLowerCase())
            );
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
                let value = row[foundKey];
                
                // Untuk nilai akhir, pastikan hanya angka yang ditampilkan
                if (targetColumn === "nilai akhir") {
                    // Ekstrak hanya angka dari string (misal "85 (Baik)" -> "85")
                    const numericValue = parseFloat(value);
                    if (!isNaN(numericValue)) {
                        return numericValue.toString();
                    }
                }
                
                return value;
            }
        }

        return '-';
    };

    // Fungsi untuk mendapatkan warna berdasarkan nilai akhir (HANYA ANGKA)
    const getNilaiAkhirColor = (nilaiAkhir) => {
        if (!nilaiAkhir || nilaiAkhir === '-') return "";
        
        const nilai = parseFloat(nilaiAkhir);
        if (isNaN(nilai)) return "";

        if (nilai >= 90) return "text-green-600 font-bold";
        if (nilai >= 80) return "text-blue-600 font-semibold";
        if (nilai >= 70) return "text-yellow-600";
        if (nilai >= 60) return "text-orange-600";
        return "text-red-600";
    };

    // Fungsi untuk mencetak data
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Data Jemaah Umrah</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 30px;
                            background: #fff;
                        }
                        h1 { 
                            color: #1e4a6b; 
                            text-align: center;
                            margin-bottom: 10px;
                            font-size: 24px;
                        }
                        .header-info {
                            text-align: center;
                            color: #666;
                            margin-bottom: 30px;
                        }
                        table { 
                            border-collapse: collapse; 
                            width: 100%; 
                            margin-top: 20px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        }
                        th { 
                            background: #1e4a6b; 
                            color: white; 
                            padding: 10px 8px; 
                            text-align: left;
                            font-size: 11px;
                            text-transform: uppercase;
                            white-space: nowrap;
                        }
                        td { 
                            border: 1px solid #ddd; 
                            padding: 8px;
                            font-size: 11px;
                        }
                        tr:nth-child(even) { 
                            background: #f0f7ff; 
                        }
                        .footer { 
                            margin-top: 30px; 
                            text-align: right; 
                            font-size: 11px; 
                            color: #666;
                            border-top: 1px solid #ddd;
                            padding-top: 15px;
                        }
                        .print-date {
                            float: left;
                        }
                        .nilai-tinggi { color: #059669; font-weight: bold; }
                        .nilai-sedang { color: #d97706; }
                        .nilai-rendah { color: #dc2626; }
                        @media print {
                            body { padding: 15px; }
                            th { background: #1e4a6b !important; color: white !important; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Data Jemaah Umrah</h1>
                    <div class="header-info">
                        <p>Total Data: ${data.length} jemaah | Dicetak: ${new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th width="30">No</th>
                                ${displayColumns.map(col =>
            `<th>${col.toUpperCase()}</th>`
        ).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.map((row, index) => {
            // Cari nilai akhir untuk styling
            const nilaiAkhir = row['nilai akhir'] || '-';
            let nilaiClass = '';
            if (nilaiAkhir !== '-') {
                const nilai = parseFloat(nilaiAkhir);
                if (!isNaN(nilai)) {
                    if (nilai >= 80) nilaiClass = 'nilai-tinggi';
                    else if (nilai >= 60) nilaiClass = 'nilai-sedang';
                    else nilaiClass = 'nilai-rendah';
                }
            }

            return `
                                    <tr>
                                        <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                                        ${displayColumns.map(col => {
                const value = row[col] || '-';
                if (col === 'nilai akhir') {
                    return `<td class="${nilaiClass}">${value}</td>`;
                }
                return `<td>${value}</td>`;
            }).join('')}
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <div class="print-date">Dicetak dari Sistem Informasi Umrah</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Fungsi untuk download Excel
    const handleDownloadExcel = () => {
        try {
            // Buat array untuk worksheet
            const worksheetData = [];

            // Header dengan judul kolom
            worksheetData.push(['NO', ...displayColumns.map(col => col.toUpperCase())]);

            // Data rows
            filteredData.forEach((row, index) => {
                const rowData = [index + 1];
                displayColumns.forEach(col => {
                    rowData.push(row[col] || '-');
                });
                worksheetData.push(rowData);
            });

            // Buat worksheet
            const ws = XLSX.utils.aoa_to_sheet(worksheetData);

            // Atur lebar kolom - NAMA dan PRESENSI ALPHA diperkecil
            const colWidths = [
                { wch: 5 },  // No
                { wch: 18 }, // NAMA - diperkecil dari 25 jadi 18
                { wch: 12 }, // KJ
                { wch: 12 }, // STATUS USIA
                { wch: 12 }, // MASA KERJA
                { wch: 15 }, // SANKSI DISIPLIN
                { wch: 15 }, // IBADAH KEAGAMAAN
                { wch: 12 }, // PRESENSI ALPHA - diperkecil dari 18 jadi 12
                { wch: 15 }  // NILAI AKHIR - diperbesar agar muat
            ];
            ws['!cols'] = colWidths;

            // Buat workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data Umrah");

            // Generate filename
            const date = new Date();
            const fileName = `data_umrah_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.xlsx`;

            // Download file
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error("Error downloading Excel:", error);
            alert("Gagal mendownload file Excel. Silakan coba lagi.");
        }
    };

    // Format waktu terakhir update
    const formatLastUpdated = () => {
        if (!lastUpdated) return "";
        return lastUpdated.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Tampilkan loading
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
                    <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                        <svg className="w-12 h-12 text-blue-700 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <p className="text-blue-700 font-medium">Memuat data jemaah umrah...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-blue-600 rounded-full mb-4 shadow-lg">
                        <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-blue-900 mb-2">
                        Data Jemaah Umrah
                    </h1>
                    <div className="flex items-center justify-center gap-4">
                        <p className="text-blue-700 text-lg">
                            {filteredData.length < data.length && (
                                <span className="ml-2 text-sm bg-blue-100 px-3 py-1 rounded-full">
                                    Menampilkan {filteredData.length} data
                                </span>
                            )}
                        </p>
                        {/* Tombol Refresh */}
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                                refreshing 
                                    ? 'bg-blue-200 text-blue-500 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                            }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>{refreshing ? 'Menyegarkan...' : 'Refresh'}</span>
                        </button>
                    </div>
                    {/* Info last updated */}
                    {lastUpdated && (
                        <p className="text-sm text-blue-500 mt-2">
                            Terakhir diperbarui Jam: {formatLastUpdated()}
                        </p>
                    )}
                    <div className="w-24 h-1 bg-blue-500 mx-auto mt-4 rounded-full"></div>
                </div>

                {/* Search and Filter Section */}
                <div className="mb-6 space-y-4 bg-white p-6 rounded-2xl shadow-lg border border-blue-200">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari jemaah..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Section */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Column Filter Dropdown */}
                        <div className="relative flex-1">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                            <select
                                value={filterColumn}
                                onChange={(e) => {
                                    setFilterColumn(e.target.value);
                                    setFilterValue("");
                                }}
                                className="w-full pl-10 pr-8 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-pointer"
                            >
                                <option value="semua">Filter berdasarkan kolom</option>
                                {displayColumns.map(col => (
                                    <option key={col} value={col}>
                                        {col.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5 pointer-events-none" />
                        </div>

                        {/* Value Filter Dropdown */}
                        {filterColumn !== "semua" && (
                            <div className="relative flex-1">
                                <select
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="">Pilih nilai {filterColumn}</option>
                                    {getColumnOptions().map((value, idx) => (
                                        <option key={idx} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5 pointer-events-none" />
                            </div>
                        )}

                        {/* Clear Filters Button */}
                        {(searchTerm || filterColumn !== "semua" || filterValue) && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                            >
                                <X className="w-5 h-5" />
                                Hapus Filter
                            </button>
                        )}
                    </div>

                    {/* Active Filters Display */}
                    {(searchTerm || filterColumn !== "semua" || filterValue) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-sm text-blue-600">Filter aktif:</span>
                            {searchTerm && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    Pencarian: "{searchTerm}"
                                    <button onClick={() => setSearchTerm("")}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </span>
                            )}
                            {filterColumn !== "semua" && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    {filterColumn}: {filterValue}
                                    <button onClick={() => {
                                        setFilterColumn("semua");
                                        setFilterValue("");
                                    }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Card untuk tabel */}
                <div className="mt-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-200">
                    {/* Tombol Aksi */}
                    <div className="flex justify-between items-center p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                        <div className="flex space-x-3">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-white text-blue-700 rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Cetak</span>
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Excel</span> 
                            </button> Jika ingin merubah data , download excel kemudian buka dengan google Sheet maka akan terbarui otomatis datanya 
                        </div>

                        {/* Info jumlah data */}
                        <div className="text-sm bg-blue-100 px-3 py-1 rounded-full text-blue-700">
                            {filteredData.length} dari {data.length} data
                        </div>
                    </div>

                    {/* Tabel dengan lebar kolom yang disesuaikan */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-blue-200">
                            <thead className="bg-blue-700">
                                <tr>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-12">
                                        No
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-36">
                                        NAMA
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-20">
                                        KJ
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-24">
                                        STATUS USIA
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-24">
                                        MASA KERJA
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-28">
                                        SANKSI DISIPLIN
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-28">
                                        IBADAH KEAGAMAAN
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-20">
                                        PRESENSI ALPHA
                                    </th>
                                    <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-24">
                                        NILAI AKHIR
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-blue-100">
                                {filteredData.length > 0 ? (
                                    filteredData.map((row, index) => (
                                        <tr
                                            key={index}
                                            className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'
                                                }`}
                                        >
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                                    {index + 1}
                                                </span>
                                            </td>
                                            {displayColumns.map((column, i) => {
                                                const value = row[column] || '-';

                                                // Styling khusus
                                                let additionalClass = "";
                                                if (column === "sanksi disiplin" && value.toLowerCase().includes("ya")) {
                                                    additionalClass = "text-red-600 font-semibold";
                                                } else if (column === "presensi alpha" && !isNaN(parseInt(value)) && parseInt(value) > 5) {
                                                    additionalClass = "text-orange-600 font-semibold";
                                                } else if (column === "ibadah keagamaan" && value.toLowerCase().includes("aktif")) {
                                                    additionalClass = "text-green-600 font-semibold";
                                                } else if (column === "nilai akhir") {
                                                    additionalClass = getNilaiAkhirColor(value);
                                                }

                                                return (
                                                    <td key={i} className="px-4 py-4 whitespace-nowrap text-sm">
                                                        <span className={`${value !== '-' ? 'text-blue-900' : 'text-blue-400 italic'} ${additionalClass}`}>
                                                            {value}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={displayColumns.length + 1} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Search className="w-12 h-12 text-blue-300 mb-3" />
                                                <p className="text-blue-600 font-medium">Tidak ada data yang sesuai</p>
                                                <button
                                                    onClick={clearFilters}
                                                    className="mt-3 text-blue-500 hover:text-blue-700 underline"
                                                >
                                                    Hapus filter
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="bg-blue-50 px-6 py-4 border-t border-blue-200">
                        <div className="flex items-center justify-between text-sm text-blue-700">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Update real-time setiap 30 detik</span>
                            </div>
                            <span>{displayColumns.length} kolom</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}