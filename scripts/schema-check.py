"""Check every Supabase query in the portal against the declared schema.

Types prove the code agrees with itself. They say nothing about whether a
column exists. This parses the migrations into tables, views, columns and
foreign keys, then reads every .from(...).select(...) in the portal and checks
each name against them, walking into embeds.

It is what would have caught a certificate printing "Not recorded" because an
embed named an ambiguous foreign key, and a staff page rendering "Unnamed
project" for months because an employee could not read the projects table.
"""
import re
import os
import sys
import glob

MIG = os.path.join("portal", "supabase", "migrations")
SRC = os.path.join("portal", "src")

# Table-body lines that declare something other than a column.
SKIP = ("constraint", "unique", "primary", "check", "foreign", "exclude", "like")


def split_top(text, sep=","):
    """Split on a separator that sits outside any parentheses."""
    out, depth, cur = [], 0, ""
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == sep and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return [p.strip() for p in out if p.strip()]


def view_columns(sql, after):
    """Column names a view exposes, read from its projection.

    The projection ends at the view's OWN from, which has to be found at paren
    depth zero. A regex stopping at the first " from " stops inside the first
    correlated subquery instead, and silently drops every column declared after
    it -- which is exactly what the first version of this did.
    """
    start = re.compile(r"\bselect\b", re.I).search(sql, after)
    if not start:
        return set()
    depth, i, end = 0, start.end(), len(sql)
    while i < end - 4:
        ch = sql[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif depth == 0 and sql[i:i + 4].lower() == "from" \
                and not sql[i - 1].isalnum() and not sql[i + 4].isalnum():
            break
        i += 1

    cols = set()
    for part in split_top(sql[start.end():i]):
        alias = re.search(r"\bas\s+(\w+)\s*$", part, re.I | re.S)
        if alias:
            cols.add(alias.group(1).lower())
            continue
        simple = re.fullmatch(r"(?:\w+\.)?(\w+)", part)
        if simple:
            cols.add(simple.group(1).lower())
    return cols


def parse_schema():
    tables, fks = {}, set()
    for path in sorted(glob.glob(os.path.join(MIG, "*.sql"))):
        # Strip line comments first: a comment above a column definition
        # otherwise becomes the column name once the body is split on commas.
        sql = re.sub("--.*", "", open(path, encoding="utf-8").read())

        for m in re.finditer(r"create table (?:if not exists )?public\.(\w+)\s*\(", sql, re.I):
            name = m.group(1)
            i, depth = m.end(), 1
            while i < len(sql) and depth:
                if sql[i] == "(":
                    depth += 1
                elif sql[i] == ")":
                    depth -= 1
                i += 1
            cols = tables.setdefault(name, set())
            for part in split_top(sql[m.end():i - 1]):
                first = part.split()[0].lower().strip('"')
                if first in SKIP:
                    continue
                cols.add(first)
                if re.search(r"\breferences\b", part, re.I):
                    fks.add(f"{name}_{first}_fkey")

        # A view is a readable object like any other. A select against one has
        # to be checked too, or the checker calls it an unknown table and
        # everything it was asked to verify goes unverified.
        for m in re.finditer(r"create (?:or replace )?view\s+public\.(\w+)", sql, re.I):
            tables.setdefault(m.group(1), set()).update(view_columns(sql, m.end()))

        for m in re.finditer(r"alter table public\.(\w+)([^;]*);", sql, re.I):
            name, body = m.group(1), m.group(2)
            for cm in re.finditer(r"add column (?:if not exists )?(\w+)", body, re.I):
                tables.setdefault(name, set()).add(cm.group(1).lower())

    return tables, fks


def parse_selects():
    calls = []
    for path in glob.glob(os.path.join(SRC, "**", "*.ts*"), recursive=True):
        text = open(path, encoding="utf-8").read()
        for m in re.finditer(r'\.from\(\s*"(\w+)"\s*\)\s*(?:\n\s*)?\.select\(\s*"([^"]*)"', text):
            calls.append((path, m.group(1), m.group(2)))
    return calls


def check_list(select, table, tables, fks, path, problems):
    cols = tables.get(table)
    if cols is None:
        problems.append(f"{path}: unknown table {table}")
        return
    for item in split_top(select):
        if item in ("*", ""):
            continue
        embed = re.match(r"^(?:(\w+):)?(\w+)(?:!(\w+))?\(([^()]*(?:\([^()]*\)[^()]*)*)\)$", item)
        if embed:
            _, target, fk, inner = embed.groups()
            if fk and fk not in fks:
                problems.append(
                    f"{path}: {table} -> {target} uses foreign key {fk}, not declared in any migration")
            if target not in tables:
                problems.append(f"{path}: embed of unknown table {target}")
            else:
                check_list(inner, target, tables, fks, path, problems)
            continue
        name = item.split(":")[-1].strip()
        name = re.sub(r"\s*\{.*$", "", name)          # count hints
        name = name.split(".")[0]
        if not re.fullmatch(r"\w+", name):
            continue
        if name.lower() not in cols:
            problems.append(f"{path}: {table}.{name} is not a column")


tables, fks = parse_schema()
calls = parse_selects()
problems = []
for path, table, select in calls:
    check_list(select, table, tables, fks, path.replace("\\", "/"), problems)

print(f"tables and views parsed: {len(tables)}   foreign keys: {len(fks)}   queries checked: {len(calls)}")

# A checker that found nothing must not report success. Run from the wrong
# directory and every glob comes back empty, which reads as a clean pass.
if not tables or not calls:
    print("Found nothing to check. Run this from the repository root.")
    sys.exit(2)

if problems:
    print(f"\n{len(problems)} problem(s):")
    for p in sorted(set(problems)):
        print("  ! " + p)
    sys.exit(1)

print("\nEvery column and foreign key referenced by a select exists in the migrations.")
