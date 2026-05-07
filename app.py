from flask import Flask, render_template, request, jsonify
import os
import sys
from datetime import datetime

import logic_common
import logic_liuren
import logic_meihua
from lunar_python import Solar


app = Flask(
    __name__,
    template_folder=logic_common.get_resource_path("templates"),
    static_folder=logic_common.get_resource_path("static"),
)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/faq", methods=["GET"])
def get_faq_data():
    return jsonify({"status": "success", "data": logic_common.FAQ_DATA})


@app.route("/api/calendar", methods=["POST"])
def api_calendar():
    try:
        req = request.json
        date_str = req.get("date")
        time_str = req.get("time")        # optional "HH:MM"
        longitude = req.get("longitude")  # optional float
        dt = datetime.strptime(date_str, "%Y-%m-%d")

        gz_hour = None
        true_solar_time = None

        if time_str:
            hour, minute = map(int, time_str.split(":"))
            dt_precise = datetime(dt.year, dt.month, dt.day, hour, minute, 0)
            if longitude is not None:
                try:
                    dt_tst = logic_liuren.to_true_solar_time(dt_precise, longitude)
                    true_solar_time = dt_tst.strftime("%H:%M")
                except Exception:
                    dt_tst = dt_precise
            else:
                dt_tst = dt_precise
            solar = Solar.fromYmdHms(
                dt_tst.year, dt_tst.month, dt_tst.day, dt_tst.hour, dt_tst.minute, 0
            )
            lunar = solar.getLunar()
            gz_hour = lunar.getTimeInGanZhi()
        else:
            # Use noon as proxy so jieqi corrections are representative of the day
            solar = Solar.fromYmdHms(dt.year, dt.month, dt.day, 12, 0, 0)
            lunar = solar.getLunar()

        prev_qi = lunar.getPrevJieQi(True)
        next_qi = lunar.getNextJieQi(True)
        def _short(s): return f"{s.getMonth()}月{s.getDay()}日 {s.getHour():02d}:{s.getMinute():02d}:{s.getSecond():02d}"
        res_data = {
            "solar_date": date_str,
            "lunar_str": f"{lunar.getMonthInChinese()}月{lunar.getDayInChinese()}",
            "gz_year": logic_liuren.get_corrected_year_gz(solar, lunar),
            "gz_month": logic_liuren.get_corrected_month_gz(solar, lunar),
            "gz_day": lunar.getDayInGanZhi(),
            "week": f"星期{solar.getWeekInChinese()}",
            "gz_hour": gz_hour,
            "true_solar_time": true_solar_time,
            "longitude": round(float(longitude), 2) if longitude is not None else None,
            "jieqi_prev": prev_qi.getName(),
            "jieqi_prev_date": _short(prev_qi.getSolar()),
            "jieqi_next": next_qi.getName(),
            "jieqi_next_date": _short(next_qi.getSolar()),
        }
        return jsonify({"status": "success", "data": res_data})
    except Exception as e:
        print(f"Calendar Error: {e}")
        return jsonify({"status": "error", "message": str(e)})


@app.route("/api/divine", methods=["POST"])
def api_divine():
    try:
        req = request.json
        n1 = req["n1"]
        n2 = req["n2"]
        n3 = req["n3"]
        custom_time = req.get("timestamp")

        res_data = logic_meihua.perform_divination(n1, n2, n3, custom_time)
        return jsonify({"status": "success", "data": res_data})
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})


@app.route("/api/liuren", methods=["POST"])
def api_liuren():
    try:
        req = request.json or {}
        res_data = logic_liuren.perform_liuren(req)
        return jsonify({"status": "success", "data": res_data})
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
