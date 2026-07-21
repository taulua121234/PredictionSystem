import io

path = r"D:\Learning Code\External Project\EViENT 2\EViENT\.npmrc"

content = """link-workspace-packages = true
only-built-dependencies[] = esbuild
only-built-dependencies[] = bcryptjs
only-built-dependencies[] = bcrypt
"""

with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("SUCCESS: Updated .npmrc")
