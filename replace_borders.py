import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    def replacer(match):
        class_str = match.group(0)
        
        # Determine appropriate border color based on background
        border_color = 'border-slate-200' # default
        
        if 'bg-white' in class_str:
            border_color = 'border-slate-300'
        elif 'bg-yellow-100' in class_str or 'bg-yellow-200' in class_str:
            border_color = 'border-yellow-400'
        elif 'bg-yellow-400' in class_str or 'bg-yellow-500' in class_str or 'bg-yellow-300' in class_str:
            border_color = 'border-yellow-600'
        elif 'bg-orange-100' in class_str or 'bg-orange-200' in class_str:
            border_color = 'border-orange-300'
        elif 'bg-orange-400' in class_str or 'bg-orange-500' in class_str:
            border_color = 'border-orange-600'
        elif 'bg-cyan-100' in class_str or 'bg-cyan-50' in class_str:
            border_color = 'border-cyan-300'
        elif 'bg-blue-100' in class_str or 'bg-blue-50' in class_str:
            border_color = 'border-blue-300'
        elif 'bg-emerald-100' in class_str or 'bg-emerald-50' in class_str:
            border_color = 'border-emerald-300'
        elif 'bg-purple-100' in class_str or 'bg-purple-50' in class_str:
            border_color = 'border-purple-300'
            
        # For text colors that might imply a theme if no bg is present
        elif 'text-orange-500' in class_str:
            border_color = 'border-orange-200'
            
        return class_str.replace('border-black', border_color)

    new_content = re.sub(r'className=(["\'])(.*?)\1|className=\{`([^`]*?)`\}', 
                         lambda m: m.group(0) if 'border-black' not in m.group(0) else replacer(m), 
                         content, flags=re.DOTALL)
                         
    # Also handle standard cases if not matched above
    # Wait, the above regex captures the whole className="..."
    
    # Simpler regex: just find className="..." and replace inside it
    # Actually, let's just do a manual string replace per file if we can safely guess, 
    # but the regex is better because it checks the background within the same class string.

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.jsx'):
            process_file(os.path.join(root, file))
