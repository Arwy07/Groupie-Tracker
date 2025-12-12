package utils

// MathOrDefault exécute une fonction mathématique si la longueur est > 0, sinon retourne 0
func MathOrDefault(length int, fn func() int) int {
	if length == 0 {
		return 0
	}
	return fn()
}

