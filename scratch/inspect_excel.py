import pandas as pd
import os

folder = "/Users/kamran/Downloads/ngo/t1/sample data"
excel_files = [f for f in os.listdir(folder) if f.endswith('.xlsx')]

for f in excel_files:
    path = os.path.join(folder, f)
    try:
        # Load all sheet names
        xl = pd.ExcelFile(path)
        print(f"=== File: {f} ===")
        for sheet in xl.sheet_names:
            df = pd.read_excel(path, sheet_name=sheet, nrows=5)
            print(f"  Sheet: {sheet}")
            print(f"  Columns: {list(df.columns)}")
        print("\n")
    except Exception as e:
        print(f"Error reading {f}: {e}")
