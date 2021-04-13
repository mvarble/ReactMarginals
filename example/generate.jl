import Distributions: Exponential, Normal
import JSON: json

count = 1000

"""
generate data that is designed to look a certain way
"""
samples = map(_ -> begin
  x0 = rand(Exponential(1.0))
  x1 = x0 + 32.0
  k = rand() > 0.5
  x2 = k ? x0 + rand(Normal(1.0, 3.0)) : -2 + sin(x0) * x1
  x3 = x0 + sin(x1^2 - x1 + x2) + rand(Normal(1.0, 4.0))
  [x0, x1, x2, x3]
end, 1:count)

write("data.json", json(samples))
