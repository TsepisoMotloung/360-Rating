#!/usr/bin/env python3
"""
CSV to SQL Assignment Generator
Parses Employee_Rating_Guide_Managers.csv and generates SQL INSERT statements
"""

import csv
import sys

def parse_csv_to_sql(csv_file_path):
    """Parse CSV and generate SQL INSERT statements"""
    
    assignments = []
    current_ratee_email = None
    
    with open(csv_file_path, 'r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            ratee_email = row.get('Ratee Email ', '').strip()
            rater_email = row.get('Rater Email', '').strip()
            
            # Skip header rows and empty rows
            if not rater_email or rater_email == 'Rater Email':
                continue
            
            # Update current ratee if present
            if ratee_email:
                current_ratee_email = ratee_email
            
            # Add assignment if we have both emails
            if current_ratee_email and rater_email:
                assignments.append((rater_email, current_ratee_email))
    
    # Generate SQL
    sql_output = []
    sql_output.append("-- Generated SQL INSERT statements")
    sql_output.append("-- Total assignments: " + str(len(assignments)))
    sql_output.append("")
    sql_output.append("DECLARE @PeriodID INT = (SELECT TOP 1 RatingPeriodID FROM tblRatingPeriod WHERE IsActive = 1);")
    sql_output.append("")
    sql_output.append("INSERT INTO tblRatingAssignment (RatingPeriodID, RaterUserID, RaterEmail, RateeUserID, RateeEmail, IsCompleted)")
    sql_output.append("SELECT")
    sql_output.append("    @PeriodID,")
    sql_output.append("    LEFT(RaterEmail, CHARINDEX('@', RaterEmail) - 1),")
    sql_output.append("    RaterEmail,")
    sql_output.append("    LEFT(RateeEmail, CHARINDEX('@', RateeEmail) - 1),")
    sql_output.append("    RateeEmail,")
    sql_output.append("    0")
    sql_output.append("FROM (VALUES")
    
    # Add all assignments
    for i, (rater, ratee) in enumerate(assignments):
        comma = "," if i < len(assignments) - 1 else ""
        sql_output.append(f"    ('{rater}', '{ratee}'){comma}")
    
    sql_output.append(") AS Assignments(RaterEmail, RateeEmail)")
    sql_output.append("WHERE NOT EXISTS (")
    sql_output.append("    SELECT 1 FROM tblRatingAssignment")
    sql_output.append("    WHERE RatingPeriodID = @PeriodID")
    sql_output.append("    AND RaterEmail = Assignments.RaterEmail")
    sql_output.append("    AND RateeEmail = Assignments.RateeEmail")
    sql_output.append(");")
    sql_output.append("")
    sql_output.append("PRINT 'Assignments imported: ' + CAST(@@ROWCOUNT AS VARCHAR);")
    
    return "\n".join(sql_output)

def generate_json_format(csv_file_path):
    """Generate JSON format for API import"""
    import json
    
    assignments = []
    current_ratee_email = None
    
    with open(csv_file_path, 'r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            ratee_email = row.get('Ratee Email ', '').strip()
            rater_email = row.get('Rater Email', '').strip()
            
            if not rater_email or rater_email == 'Rater Email':
                continue
            
            if ratee_email:
                current_ratee_email = ratee_email
            
            if current_ratee_email and rater_email:
                assignments.append({
                    "raterEmail": rater_email,
                    "raterUserId": rater_email.split('@')[0],
                    "rateeEmail": current_ratee_email,
                    "rateeUserId": current_ratee_email.split('@')[0],
                    "periodId": 1  # Will be updated dynamically
                })
    
    return json.dumps(assignments, indent=2)

if __name__ == "__main__":
    csv_file = "/mnt/user-data/uploads/Employee_Rating_Guide_Managers.csv"
    
    print("Generating SQL INSERT statements...")
    sql = parse_csv_to_sql(csv_file)
    
    # Save SQL to file
    with open("/home/claude/360-rating-app/database/import-assignments.sql", "w") as f:
        f.write(sql)
    
    print("✓ SQL file created: database/import-assignments.sql")
    
    # Generate JSON format
    json_data = generate_json_format(csv_file)
    with open("/home/claude/360-rating-app/database/assignments.json", "w") as f:
        f.write(json_data)
    
    print("✓ JSON file created: database/assignments.json")
    print(f"✓ Total assignments processed: {sql.count('(')}")
