import http.server
import json
import urllib.parse
import re
import traceback
from google.oauth2 import service_account
from googleapiclient.discovery import build

CREDS_FILE = r'C:\Users\Lenovo\Downloads\id-kerusakan-assistant-43cebc34f479.json'
SPREADSHEET_ID = '1zQj-rFSGyqe1VQtdqvNplxdRtrWeCfz9ra5dh_NANGw'

creds = service_account.Credentials.from_service_account_file(
    CREDS_FILE,
    scopes=['https://www.googleapis.com/auth/spreadsheets']
)
sheets_service = build('sheets', 'v4', credentials=creds)

REGIONS = [
    {'id': 'reg_banjarmasin', 'name': 'Banjarmasin', 'code': 'BJM', 'col_idx': 3},
    {'id': 'reg_jakarta', 'name': 'Jakarta', 'code': 'JKT', 'col_idx': 4},
    {'id': 'reg_malang', 'name': 'Malang', 'code': 'MLG', 'col_idx': 5},
    {'id': 'reg_palembang', 'name': 'Palembang', 'code': 'PLB', 'col_idx': 6},
    {'id': 'reg_semarang', 'name': 'Semarang', 'code': 'SMG', 'col_idx': 7},
    {'id': 'reg_solo', 'name': 'Solo / Surakarta', 'code': 'SLO', 'col_idx': 8},
    {'id': 'reg_surabaya', 'name': 'Surabaya', 'code': 'SBY', 'col_idx': 9},
    {'id': 'reg_yogyakarta', 'name': 'Yogyakarta', 'code': 'DIY', 'col_idx': 10, 'is_default': True}
]

CATEGORIES = [
    {'id': 'cat_arsitektural', 'name': 'Arsitektural'},
    {'id': 'cat_struktur', 'name': 'Struktur'},
    {'id': 'cat_elektrikal', 'name': 'Elektrikal'},
    {'id': 'cat_mekanikal', 'name': 'Mekanikal'},
    {'id': 'cat_landscape', 'name': 'Landscape'}
]

def parse_num(val):
    if not val:
        return 0.0
    s = str(val).replace('Rp', '').replace('.', '').replace(' ', '').replace(',', '.').strip()
    try:
        return float(s)
    except:
        return 0.0

def read_database():
    res = sheets_service.spreadsheets().values().batchGet(
        spreadsheetId=SPREADSHEET_ID,
        ranges=['AHSP!A1:E700', "'HARGA BAHAN'!A1:M400", "'MASTER KOMPONEN'!A2:H100"]
    ).execute()
    
    vr = res.get('valueRanges', [])
    ahsp_rows = vr[0].get('values', [])
    hb_rows = vr[1].get('values', [])
    mk_rows = vr[2].get('values', [])
    
    # 1. Master components
    components = []
    comp_map = {}
    for r in mk_rows:
        if len(r) >= 5 and r[0].strip():
            code = r[0].strip()
            ctype = r[1].strip().lower()
            if ctype in ['jasa', 'tenaga']:
                ctype = 'tenaga'
            elif ctype == 'alat':
                ctype = 'alat'
            else:
                ctype = 'bahan'
            name = r[2].strip()
            spec = r[3].strip() if len(r) > 3 else ''
            unit = r[4].strip()
            comp = {
                'id': code,
                'componentCode': code,
                'name': name,
                'normalized_name': name.lower(),
                'type': ctype,
                'unit': unit,
                'specification': spec,
                'brand': 'Non Merek',
                'created_at': '',
                'updated_at': r[7].strip() if len(r) > 7 else ''
            }
            components.append(comp)
            comp_map[code] = comp

    # 2. Variants and Regional Prices
    component_variants = []
    regional_prices = []
    curr_header = None
    for r in hb_rows:
        if not r or not any(r):
            continue
        code0 = r[0].strip()
        if (code0.startswith('BHN.') or code0.startswith('JS.') or code0.startswith('ALT.')) and not '-V' in code0:
            curr_header = code0
            continue
        if code0.startswith('BHN.') or code0.startswith('JS.') or code0.startswith('ALT.'):
            var_id = code0
            parent_code = curr_header or code0.split('-')[0]
            brand = r[1].strip() if len(r) > 1 else 'Non Merek'
            unit = r[2].strip() if len(r) > 2 else 'unit'
            source = r[11].strip() if len(r) > 11 else ''
            var_rec = {
                'variantId': var_id,
                'componentCode': parent_code,
                'variantName': comp_map.get(parent_code, {}).get('name', ''),
                'brand': brand,
                'unit': unit,
                'priceSource': source
            }
            component_variants.append(var_rec)
            for reg in REGIONS:
                col = reg['col_idx']
                p_val = parse_num(r[col]) if len(r) > col else 0.0
                regional_prices.append({
                    'id': f"rp_{var_id}_{reg['id']}",
                    'component_id': var_id,
                    'variantId': var_id,
                    'componentCode': parent_code,
                    'region_id': reg['id'],
                    'price': p_val,
                    'source': source,
                    'source_type': 'RESMI',
                    'year': 2026
                })

    # 3. AHSP
    ahsps = []
    curr_job = None
    for r in ahsp_rows:
        if not r or not any(r):
            continue
        code_val = r[0].strip() if len(r) > 0 else ''
        if re.match(r'^[A-Z]\.\d+\.\d+$', code_val):
            job_code = code_val
            job_name = r[1].strip() if len(r) > 1 else ''
            unit_str = r[2].replace('Satuan:', '').strip() if len(r) > 2 else ''
            ref_banner = r[3].strip() if len(r) > 3 else ''
            curr_job = {
                'id': f"ahsp_{job_code.lower().replace('.', '_')}",
                'code': job_code,
                'name': job_name,
                'category_id': 'cat_arsitektural' if job_code.startswith('A.') else 'cat_struktur',
                'unit': unit_str,
                'unit_status': 'AHSP_UNIT_FROM_TOTAL',
                'reference': ref_banner,
                'year': 2026,
                'overhead_profit_pct': 0,
                'components': []
            }
            ahsps.append(curr_job)
            continue
        if curr_job and len(r) >= 5 and r[0].strip().upper() in ['TENAGA', 'BAHAN', 'ALAT']:
            ctype = r[0].strip().lower()
            uraian = r[1].strip()
            unit = r[2].strip()
            koef = parse_num(r[3])
            code = r[4].strip()
            curr_job['components'].append({
                'component_id': code,
                'componentCode': code,
                'component_type': ctype,
                'coefficient': koef
            })

    return {
        'components': components,
        'componentVariants': component_variants,
        'regionalPrices': regional_prices,
        'ahsps': ahsps,
        'categories': CATEGORIES,
        'regions': REGIONS
    }

class MRVHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        res_type = qs.get('resource', ['data'])[0]
        
        if res_type == 'health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'ok': True,
                'apiVersion': 'rab-viewer-mrv-bridge-2026.10.10',
                'status': 200,
                'engine': 'Direct Service Account SSOT Bridge'
            }).encode('utf-8'))
            return
            
        try:
            data = read_database()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'data': data}).encode('utf-8'))
        except Exception as e:
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode('utf-8'))

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        qs = urllib.parse.parse_qs(body)
        action = qs.get('action', [''])[0]
        
        try:
            data = read_database()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'action': action, 'data': data}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode('utf-8'))

if __name__ == '__main__':
    port = 3005
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), MRVHandler)
    print(f"MRV Direct API Bridge running on http://127.0.0.1:{port}")
    server.serve_forever()
