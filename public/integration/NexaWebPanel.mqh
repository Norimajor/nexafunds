//+------------------------------------------------------------------+
//| NexaWebPanel.mqh — shows the web-rendered NEXA AI panel in MT5   |
//| Tools > Options > Expert Advisors > Allow WebRequest for:        |
//|   https://nexafunds.onrender.com                                 |
//+------------------------------------------------------------------+
#property strict

input string WP_Url    = "https://nexafunds.onrender.com/api/mt5/panel.bmp";
input string WP_ApiKey = "";
input int    WP_X      = 10;
input int    WP_Y      = 30;

#define WP_OBJ "NEXA_WEBPANEL"
#define WP_RES "::nexa_webpanel"

string  wp_actions[];
int     wp_rects[][4];
string  wp_tab = "trade";
datetime wp_lastOk = 0;

// Implement in your EA: called when a panel button is clicked.
void WP_OnAction(const string action);
// Implement in your EA: return the state JSON (see panel-state.ts).
string WP_BuildStateJson();

bool WP_Init()
  {
   EventSetTimer(1);
   ObjectCreate(0, WP_OBJ, OBJ_BITMAP_LABEL, 0, 0, 0);
   ObjectSetInteger(0, WP_OBJ, OBJPROP_XDISTANCE, WP_X);
   ObjectSetInteger(0, WP_OBJ, OBJPROP_YDISTANCE, WP_Y);
   ObjectSetInteger(0, WP_OBJ, OBJPROP_SELECTABLE, false);
   ChartSetInteger(0, CHART_EVENT_MOUSE_MOVE, false);
   WP_Refresh();
   return true;
  }

void WP_Deinit()
  {
   EventKillTimer();
   ObjectDelete(0, WP_OBJ);
   ResourceFree(WP_RES);
  }

string WP_Header(const string headers, const string name)
  {
   string lines[];
   int n = StringSplit(headers, '\n', lines);
   for(int i = 0; i < n; i++)
     {
      int p = StringFind(lines[i], ":");
      if(p > 0 && StringCompare(StringSubstr(lines[i], 0, p), name, false) == 0)
        {
         string v = StringSubstr(lines[i], p + 1);
         StringTrimLeft(v); StringTrimRight(v);
         return v;
        }
     }
   return "";
  }

void WP_ParseHitmap(const string hm)
  {
   string items[];
   int n = StringSplit(hm, ';', items);
   ArrayResize(wp_actions, n);
   ArrayResize(wp_rects, n);
   for(int i = 0; i < n; i++)
     {
      string f[];
      if(StringSplit(items[i], ',', f) < 5) continue;
      wp_actions[i] = f[0];
      for(int k = 0; k < 4; k++) wp_rects[i][k] = (int)StringToInteger(f[k + 1]);
     }
  }

int WP_ReadInt(const uchar &b[], int o) { return b[o] | (b[o+1] << 8) | (b[o+2] << 16) | (b[o+3] << 24); }

void WP_Refresh()
  {
   string json = WP_BuildStateJson();
   uchar body[], result[];
   StringToCharArray(json, body, 0, StringLen(json), CP_UTF8);
   string headers = "Content-Type: application/json\r\nX-API-Key: " + WP_ApiKey + "\r\n";
   string resHeaders;
   int code = WebRequest("POST", WP_Url, headers, 3000, body, result, resHeaders);
   if(code != 200 || ArraySize(result) < 54 || result[0] != 'B' || result[1] != 'M')
     {
      if(TimeCurrent() - wp_lastOk > 10) Comment("NEXA panel: server unreachable (", code, ")");
      return; // keep last good image on screen
     }
   Comment("");
   wp_lastOk = TimeCurrent();
   int off = WP_ReadInt(result, 10), w = WP_ReadInt(result, 18), h = WP_ReadInt(result, 22);
   uint px[];
   ArrayResize(px, w * h);
   for(int y = 0; y < h; y++)
      for(int x = 0; x < w; x++)
        {
         int s = off + ((h - 1 - y) * w + x) * 4;
         px[y * w + x] = ((uint)result[s+3] << 24) | ((uint)result[s+2] << 16) | ((uint)result[s+1] << 8) | result[s];
        }
   ResourceCreate(WP_RES, px, w, h, 0, 0, w, COLOR_FORMAT_ARGB_NORMALIZE);
   ObjectSetString(0, WP_OBJ, OBJPROP_BMPFILE, WP_RES);
   WP_ParseHitmap(WP_Header(resHeaders, "X-Hitmap"));
   ChartRedraw();
  }

void WP_OnTimer() { WP_Refresh(); }

void WP_OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
  {
   if(id != CHARTEVENT_CLICK) return;
   int cx = (int)lparam - WP_X, cy = (int)dparam - WP_Y;
   for(int i = 0; i < ArraySize(wp_actions); i++)
      if(cx >= wp_rects[i][0] && cx < wp_rects[i][0] + wp_rects[i][2] &&
         cy >= wp_rects[i][1] && cy < wp_rects[i][1] + wp_rects[i][3])
        {
         if(StringFind(wp_actions[i], "tab:") == 0) wp_tab = StringSubstr(wp_actions[i], 4);
         WP_OnAction(wp_actions[i]);
         WP_Refresh(); // instant feedback
         return;
        }
  }

//--- Example wiring inside NEXA AI 2.35:
// int  OnInit()  { WP_Init(); return INIT_SUCCEEDED; }
// void OnDeinit(const int r) { WP_Deinit(); }
// void OnTimer() { WP_OnTimer(); }
// void OnChartEvent(const int id,const long &l,const double &d,const string &s){ WP_OnChartEvent(id,l,d,s); }
// string WP_BuildStateJson()
//   {
//    return StringFormat("{\"tab\":\"%s\",\"running\":%s,\"server\":\"%s\",\"date\":\"%s\",\"time\":\"%s\","
//                        "\"balance\":%.2f,\"equity\":%.2f,\"floating\":%.2f,\"riskMode\":\"%s\",\"riskPct\":%.1f}",
//       wp_tab, g_running ? "true" : "false", AccountInfoString(ACCOUNT_SERVER),
//       TimeToString(TimeCurrent(), TIME_DATE), TimeToString(TimeCurrent(), TIME_SECONDS),
//       AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY),
//       AccountInfoDouble(ACCOUNT_PROFIT), g_riskMode, g_riskPct);
//   }
// void WP_OnAction(const string a)
//   {
//    if(a == "start") g_running = true;
//    else if(a == "stop_close") { g_running = false; CloseAllEATrades(); }
//    else if(a == "toggle:buy") g_buyOn = !g_buyOn;
//    else if(a == "mode:risk") g_riskMode = "risk";
//    else if(a == "risk:+") g_riskPct += 0.1;
//    // ... map the rest of the data-action names from the web panel
//   }
