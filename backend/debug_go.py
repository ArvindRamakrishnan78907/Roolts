import requests
import json

url = "http://localhost:5000/api/executor/execute"
data = {
    "language": "go",
    "code": 'package main\nimport "fmt"\nfunc main() {\n    var name string\n    fmt.Scan(&name)\n    fmt.Printf("Hello %s\\n", name)\n}',
    "filename": "main.go",
    "input": "Arvind"
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
